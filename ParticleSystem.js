(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Particle System должен быть запущен вне песочницы');
    }

    class ParticleSystem {
        constructor() {
            this.systems = new Map();
            this._setupRenderer();
            this._setupResizeHandler();
            this.lastTime = Date.now();
        }

        _setupRenderer() {
            const vm = Scratch.vm;
            if (!vm || !vm.runtime || !vm.runtime.renderer) {
                setTimeout(() => this._setupRenderer(), 100);
                return;
            }

            this.scratchRenderer = vm.runtime.renderer;
            this.canvas = this.scratchRenderer.canvas;

            // Создаем canvas для частиц
            this.particleCanvas = document.createElement('canvas');
            this.ctx = this.particleCanvas.getContext('2d');

            // Устанавливаем размеры
            this._updateCanvasSize();

            // Добавляем canvas на сцену
            if (this.canvas.parentElement) {
                this.canvas.parentElement.insertBefore(this.particleCanvas, this.canvas.nextSibling);
                this.particleCanvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 2;
                `;
            }

            this._startRendering();
        }

        _setupResizeHandler() {
            window.addEventListener('resize', () => {
                this._updateCanvasSize();
            });
        }

        _updateCanvasSize() {
            const rect = this.canvas.getBoundingClientRect();
            this.particleCanvas.width = rect.width;
            this.particleCanvas.height = rect.height;
            this.width = rect.width;
            this.height = rect.height;
        }

        _startRendering() {
            const render = () => {
                this._renderFrame();
                requestAnimationFrame(render);
            };
            render();
        }

        _renderFrame() {
            const currentTime = Date.now();
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            // Очищаем canvas
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Обновляем и рендерим каждую систему частиц
            for (const [id, system] of this.systems) {
                this._updateParticleSystem(system, deltaTime);
                this._renderParticleSystem(system);
            }
        }

        _updateParticleSystem(system, deltaTime) {
            // Создаем новые частицы
            const emissionRate = system.emissionRate * deltaTime;
            const particlesToEmit = Math.floor(system.particleCount + emissionRate);
            
            for (let i = system.particles.length; i < particlesToEmit && system.active; i++) {
                system.particles.push(this._createParticle(system));
            }

            system.particleCount = system.particles.length;

            // Обновляем существующие частицы
            for (let i = system.particles.length - 1; i >= 0; i--) {
                const particle = system.particles[i];
                
                // Обновляем позицию
                particle.x += particle.velocityX * deltaTime;
                particle.y += particle.velocityY * deltaTime;
                
                // Применяем гравитацию
                particle.velocityY += system.gravity * deltaTime;
                
                // Применяем трение
                if (system.friction > 0) {
                    const friction = 1 - system.friction * deltaTime;
                    particle.velocityX *= friction;
                    particle.velocityY *= friction;
                }
                
                // Обрабатываем отскок от границ экрана
                if (system.bounce > 0) {
                    const bounds = this._getScreenBounds();
                    if (particle.y <= bounds.bottom || particle.y >= bounds.top) {
                        particle.velocityY = -particle.velocityY * system.bounce;
                    }
                    if (particle.x <= bounds.left || particle.x >= bounds.right) {
                        particle.velocityX = -particle.velocityX * system.bounce;
                    }
                }
                
                // Обновляем время жизни
                particle.life -= deltaTime;
                
                // Удаляем мертвые частицы
                if (particle.life <= 0) {
                    system.particles.splice(i, 1);
                    continue;
                }
                
                // Обновляем размер и прозрачность
                const lifeRatio = particle.life / particle.maxLife;
                particle.size = particle.startSize + (particle.endSize - particle.startSize) * (1 - lifeRatio);
                particle.alpha = particle.startAlpha + (particle.endAlpha - particle.startAlpha) * (1 - lifeRatio);
            }

            // Обновляем позицию системы, если она привязана к спрайту
            if (system.attachedSprite) {
                const target = this._getTargetByName(system.attachedSprite);
                if (target) {
                    const pos = this._convertToCanvasCoords(target.x, target.y);
                    system.x = pos.x;
                    system.y = pos.y;
                }
            }
        }

        _renderParticleSystem(system) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = system.blendMode;

            for (const particle of system.particles) {
                const coords = this._convertToCanvasCoords(particle.x, particle.y);
                this.ctx.globalAlpha = particle.alpha;
                
                switch (system.type) {
                    case 'circle':
                        this._renderCircle(coords, particle);
                        break;
                    case 'square':
                        this._renderSquare(coords, particle);
                        break;
                    case 'triangle':
                        this._renderTriangle(coords, particle);
                        break;
                    case 'star':
                        this._renderStar(coords, particle);
                        break;
                    case 'line':
                        this._renderLine(coords, particle);
                        break;
                    case 'image':
                        this._renderImage(coords, particle, system);
                        break;
                }
            }
            
            this.ctx.restore();
        }

        _renderCircle(coords, particle) {
            this.ctx.beginPath();
            this.ctx.arc(coords.x, coords.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        }

        _renderSquare(coords, particle) {
            const size = particle.size;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(
                coords.x - size,
                coords.y - size,
                size * 2,
                size * 2
            );
        }

        _renderTriangle(coords, particle) {
            const size = particle.size;
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x, coords.y - size);
            this.ctx.lineTo(coords.x + size * Math.cos(Math.PI / 6), coords.y + size * Math.sin(Math.PI / 6));
            this.ctx.lineTo(coords.x - size * Math.cos(Math.PI / 6), coords.y + size * Math.sin(Math.PI / 6));
            this.ctx.closePath();
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        }

        _renderStar(coords, particle) {
            const outerRadius = particle.size;
            const innerRadius = particle.size * 0.4;
            const spikes = 5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x, coords.y - outerRadius);

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / spikes) * i;
                const x = coords.x + Math.sin(angle) * radius;
                const y = coords.y - Math.cos(angle) * radius;
                this.ctx.lineTo(x, y);
            }

            this.ctx.closePath();
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        }

        _renderImage(coords, particle, system) {
            if (system.texture) {
                const size = particle.size * 2;
                this.ctx.drawImage(
                    system.texture,
                    coords.x - size/2,
                    coords.y - size/2,
                    size,
                    size
                );
            }
        }

        _renderLine(coords, particle) {
            const angle = particle.angle || Math.PI; // По умолчанию вертикально вниз
            const length = particle.size;
            
            this.ctx.beginPath();
            this.ctx.moveTo(coords.x, coords.y);
            this.ctx.lineTo(
                coords.x + Math.cos(angle) * length,
                coords.y + Math.sin(angle) * length
            );
            this.ctx.strokeStyle = particle.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        _createParticle(system) {
            const angle = system.angle + (Math.random() - 0.5) * system.spread;
            const speed = system.speed + (Math.random() - 0.5) * system.speedVariation;
            
            return {
                x: system.x,
                y: system.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: system.particleLife + (Math.random() - 0.5) * system.particleLifeVariation,
                maxLife: system.particleLife,
                color: system.colors[Math.floor(Math.random() * system.colors.length)],
                startSize: system.startSize + (Math.random() - 0.5) * system.sizeVariation,
                endSize: system.endSize + (Math.random() - 0.5) * system.sizeVariation,
                size: system.startSize,
                startAlpha: system.startAlpha,
                endAlpha: system.endAlpha,
                alpha: system.startAlpha
            };
        }

        _convertToCanvasCoords(x, y) {
            const scale = Math.min(this.width / 480, this.height / 360);
            return {
                x: this.width/2 + x * scale,
                y: this.height/2 - y * scale
            };
        }

        // Методы для блоков Scratch

        createParticleSystem(args) {
            // Удаляем старую систему, если она существует
            if (this.systems.has(args.ID)) {
                this.systems.delete(args.ID);
            }

            const system = {
                id: args.ID,
                x: 0,
                y: 0,
                type: args.TYPE || 'circle',
                emissionRate: args.RATE || 50,
                particleLife: args.LIFE || 1,
                particleLifeVariation: (args.LIFE || 1) * 0.2,
                angle: (args.ANGLE || 0) * Math.PI / 180,
                spread: (args.SPREAD || 360) * Math.PI / 180,
                speed: args.SPEED || 100,
                speedVariation: (args.SPEED || 100) * 0.5,
                gravity: args.GRAVITY || 0,
                startSize: args.START_SIZE || 10,
                endSize: args.END_SIZE || 5,
                sizeVariation: args.SIZE_VARIATION || 2,
                startAlpha: args.START_ALPHA || 1,
                endAlpha: args.END_ALPHA || 0,
                colors: args.COLORS ? args.COLORS.split(',').map(c => c.trim()) : ['#ff0000', '#ff7700', '#ffff00'],
                blendMode: args.BLEND_MODE || 'source-over',
                bounce: args.BOUNCE || 0,
                friction: args.FRICTION || 0,
                particles: [],
                particleCount: 0,
                active: true
            };

            this.systems.set(args.ID, system);
            return true;
        }

        setSystemPosition(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.x = args.X;
                system.y = args.Y;
            }
        }

        setSystemProperty(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system[args.PROPERTY] = args.VALUE;
            }
        }

        removeSystem(args) {
            this.systems.delete(args.ID);
        }

        getInfo() {
            return {
                id: 'particlesystem',
                name: 'Particle System',
                color1: '#FF4D4D',
                color2: '#FF2929',
                blocks: [
                    {
                        opcode: 'createParticleSystem',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать систему частиц [ID] тип: [TYPE] частиц/сек: [RATE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'particleTypes'
                            },
                            RATE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 50
                            }
                        }
                    },
                    {
                        opcode: 'setParticleProperties',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'настроить частицы [ID] время жизни: [LIFE] начальный размер: [START_SIZE] конечный размер: [END_SIZE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            LIFE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            },
                            START_SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            },
                            END_SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 5
                            }
                        }
                    },
                    {
                        opcode: 'setEmissionProperties',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'настроить эмиссию [ID] угол: [ANGLE]° разброс: [SPREAD]° скорость: [SPEED]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            ANGLE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            SPREAD: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 360
                            },
                            SPEED: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: 'setColors',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить цвета [ID] цвета: [COLORS] режим смешивания: [BLEND]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            COLORS: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '#ff0000, #ff7700, #ffff00'
                            },
                            BLEND: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'blendModes'
                            }
                        }
                    },
                    {
                        opcode: 'setPhysics',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'физика частиц [ID] гравитация: [GRAVITY] отскок: [BOUNCE] трение: [FRICTION]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            GRAVITY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            BOUNCE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            FRICTION: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },
                    {
                        opcode: 'setSystemPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить позицию системы [ID] x: [X] y: [Y]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },
                    {
                        opcode: 'attachToSprite',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'привязать систему [ID] к спрайту [SPRITE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Sprite1'
                            }
                        }
                    },
                    {
                        opcode: 'setPreset',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить пресет [ID] эффект: [PRESET]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            PRESET: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'presets'
                            }
                        }
                    },
                    {
                        opcode: 'removeSystem',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить систему частиц [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            }
                        }
                    },
                    {
                        opcode: 'setColorProperties',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'настроить цвета [ID] цвета: [COLORS] прозрачность: [ALPHA] смешивание: [BLEND]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            },
                            COLORS: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '#ff0000, #ff7700, #ffff00'
                            },
                            ALPHA: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            },
                            BLEND: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'blendModes'
                            }
                        }
                    }
                ],
                menus: {
                    particleTypes: {
                        acceptReporters: false,
                        items: ['circle', 'square', 'triangle', 'star', 'image']
                    },
                    blendModes: {
                        acceptReporters: false,
                        items: [
                            'source-over',
                            'lighter',
                            'multiply',
                            'screen',
                            'overlay',
                            'darken',
                            'lighten'
                        ]
                    },
                    presets: {
                        acceptReporters: false,
                        items: [
                            'fire',
                            'smoke',
                            'sparkles',
                            'rain',
                            'snow',
                            'bubbles',
                            'explosion',
                            'magic',
                            'dust',
                            'hearts',
                            'confetti',
                            'matrix'
                        ]
                    }
                }
            };
        }

        setParticleProperties(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.particleLife = args.LIFE;
                system.startSize = args.START_SIZE;
                system.endSize = args.END_SIZE;
                system.particleLifeVariation = args.LIFE * 0.2;
            }
        }

        setEmissionProperties(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.angle = args.ANGLE * Math.PI / 180;
                system.spread = args.SPREAD * Math.PI / 180;
                system.speed = args.SPEED;
                system.speedVariation = args.SPEED * 0.5;
            }
        }

        setColors(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.colors = args.COLORS.split(',').map(c => c.trim());
                system.blendMode = args.BLEND;
            }
        }

        setPhysics(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.gravity = args.GRAVITY;
                system.bounce = Math.min(Math.max(args.BOUNCE, 0), 1);
                system.friction = Math.min(Math.max(args.FRICTION, 0), 1);
            }
        }

        attachToSprite(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.attachedSprite = args.SPRITE;
                // Обновляем позицию в методе _renderFrame
            }
        }

        setPreset(args) {
            const presets = {
                fire: {
                    TYPE: 'circle',
                    RATE: 200,
                    LIFE: 0.8,
                    START_SIZE: 20,
                    END_SIZE: 5,
                    COLORS: '#ff4400, #ff8800, #ffcc00, #ffff00',
                    BLEND_MODE: 'screen',
                    GRAVITY: -300,
                    SPEED: 60,
                    SPREAD: 25,
                    ANGLE: -90,
                    START_ALPHA: 1,
                    END_ALPHA: 0,
                    FRICTION: 0.02
                },
                smoke: {
                    TYPE: 'circle',
                    RATE: 30,
                    LIFE: 3,
                    START_SIZE: 15,
                    END_SIZE: 80,
                    COLORS: '#222222, #444444, #666666, #888888',
                    BLEND_MODE: 'multiply',
                    GRAVITY: -40,
                    SPEED: 40,
                    SPREAD: 15,
                    ANGLE: -90,
                    START_ALPHA: 0.6,
                    END_ALPHA: 0,
                    FRICTION: 0.05
                },
                sparkles: {
                    TYPE: 'star',
                    RATE: 50,
                    LIFE: 1.5,
                    START_SIZE: 12,
                    END_SIZE: 1,
                    COLORS: '#ffff00, #ffffff, #ffaa00, #ff8800',
                    BLEND_MODE: 'screen',
                    GRAVITY: 0,
                    SPEED: 150,
                    SPREAD: 360,
                    START_ALPHA: 1,
                    END_ALPHA: 0
                },
                rain: {
                    TYPE: 'line',
                    RATE: 200,
                    LIFE: 0.8,
                    START_SIZE: 15,
                    END_SIZE: 15,
                    COLORS: '#aaaaff, #ffffff, #99ccff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 800,
                    SPEED: 400,
                    SPREAD: 10,
                    ANGLE: -180,
                    START_ALPHA: 0.4,
                    END_ALPHA: 0.2
                },
                snow: {
                    TYPE: 'circle',
                    RATE: 80,
                    LIFE: 5,
                    START_SIZE: 4,
                    END_SIZE: 4,
                    COLORS: '#ffffff, #eeeeff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 30,
                    SPEED: 50,
                    SPREAD: 40,
                    ANGLE: -180,
                    START_ALPHA: 0.9,
                    END_ALPHA: 0.3,
                    FRICTION: 0.01
                },
                bubbles: {
                    TYPE: 'circle',
                    RATE: 30,
                    LIFE: 4,
                    START_SIZE: 5,
                    END_SIZE: 20,
                    COLORS: '#88ffff, #ffffff, #aaffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: -80,
                    SPEED: 50,
                    SPREAD: 30,
                    ANGLE: 90,
                    START_ALPHA: 0.6,
                    END_ALPHA: 0,
                    FRICTION: 0.02
                },
                explosion: {
                    TYPE: 'circle',
                    RATE: 1000,
                    LIFE: 0.8,
                    START_SIZE: 15,
                    END_SIZE: 3,
                    COLORS: '#ff4400, #ff8800, #ffff00, #ffffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 0,
                    SPEED: 500,
                    SPREAD: 360,
                    START_ALPHA: 1,
                    END_ALPHA: 0
                },
                magic: {
                    TYPE: 'star',
                    RATE: 100,
                    LIFE: 2,
                    START_SIZE: 15,
                    END_SIZE: 0,
                    COLORS: '#ff00ff, #8800ff, #00ffff, #ffffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: -100,
                    SPEED: 150,
                    SPREAD: 360,
                    START_ALPHA: 1,
                    END_ALPHA: 0
                },
                dust: {
                    TYPE: 'circle',
                    RATE: 50,
                    LIFE: 3,
                    START_SIZE: 3,
                    END_SIZE: 1,
                    COLORS: '#ffcc88, #ffaa66, #ffddaa',
                    BLEND_MODE: 'screen',
                    GRAVITY: -20,
                    SPEED: 70,
                    SPREAD: 180,
                    ANGLE: 90,
                    START_ALPHA: 0.7,
                    END_ALPHA: 0
                },
                hearts: {
                    TYPE: 'image',
                    RATE: 20,
                    LIFE: 2,
                    START_SIZE: 15,
                    END_SIZE: 5,
                    COLORS: '#ff0000, #ff4444',
                    BLEND_MODE: 'screen',
                    GRAVITY: -50,
                    SPEED: 100,
                    SPREAD: 30,
                    ANGLE: 90,
                    START_ALPHA: 1,
                    END_ALPHA: 0,
                    TEXTURE_URL: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjZmYwMDAwIiBkPSJNMTIsMjFMMTAuNSwxOS41QzUuNCwxNC45IDIsMTEuOSAyLDguNUMyLDUuOCA0LjIsMy43IDcsM0M4LjQsMyA5LjcsMy41IDEwLjcsNC4zQzExLjUsMy41IDEyLjgsMiAxNCwyQzE2LjgsMiAxOSw0LjEgMTksNi44QzE5LDEwLjIgMTUuNiwxMy4yIDEwLjUsMTcuOEwxMiwyMVoiLz48L3N2Zz4='
                },
                confetti: {
                    TYPE: 'square',
                    RATE: 200,
                    LIFE: 3,
                    START_SIZE: 8,
                    END_SIZE: 8,
                    COLORS: '#ff0000, #00ff00, #0000ff, #ffff00, #ff00ff, #00ffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 200,
                    SPEED: 300,
                    SPREAD: 80,
                    ANGLE: -90,
                    START_ALPHA: 1,
                    END_ALPHA: 0.5,
                    FRICTION: 0.01
                },
                matrix: {
                    TYPE: 'line',
                    RATE: 50,
                    LIFE: 4,
                    START_SIZE: 20,
                    END_SIZE: 20,
                    COLORS: '#00ff00, #88ff88',
                    BLEND_MODE: 'screen',
                    GRAVITY: 100,
                    SPEED: 100,
                    SPREAD: 5,
                    ANGLE: 180,
                    START_ALPHA: 1,
                    END_ALPHA: 0
                },
                portal: {
                    TYPE: 'circle',
                    RATE: 150,
                    LIFE: 2,
                    START_SIZE: 5,
                    END_SIZE: 1,
                    COLORS: '#4444ff, #0000ff, #8888ff, #ffffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 0,
                    SPEED: 100,
                    SPREAD: 360,
                    ANGLE: 0,
                    START_ALPHA: 1,
                    END_ALPHA: 0,
                    SPIRAL: true,
                    SPIRAL_SPEED: 5
                },
                laser: {
                    TYPE: 'line',
                    RATE: 500,
                    LIFE: 0.3,
                    START_SIZE: 30,
                    END_SIZE: 10,
                    COLORS: '#ff0000, #ff4444, #ff8888',
                    BLEND_MODE: 'screen',
                    GRAVITY: 0,
                    SPEED: 800,
                    SPREAD: 5,
                    ANGLE: 0,
                    START_ALPHA: 1,
                    END_ALPHA: 0,
                    PULSE: true,
                    PULSE_SPEED: 10
                },
                galaxy: {
                    TYPE: 'star',
                    RATE: 100,
                    LIFE: 4,
                    START_SIZE: 3,
                    END_SIZE: 1,
                    COLORS: '#ffffff, #8844ff, #4444ff, #44ffff',
                    BLEND_MODE: 'screen',
                    GRAVITY: 0,
                    SPEED: 50,
                    SPREAD: 360,
                    ANGLE: 0,
                    START_ALPHA: 1,
                    END_ALPHA: 0,
                    ORBIT: true,
                    ORBIT_SPEED: 2
                }
            };

            const preset = presets[args.PRESET];
            if (preset) {
                preset.ID = args.ID;
                this.createParticleSystem(preset);
            }
        }

        _getScreenBounds() {
            const scale = Math.min(this.width / 480, this.height / 360);
            return {
                left: -this.width / (2 * scale),
                right: this.width / (2 * scale),
                top: this.height / (2 * scale),
                bottom: -this.height / (2 * scale)
            };
        }

        _getTargetByName(name) {
            const targets = Scratch.vm.runtime.targets;
            return targets.find(target => target.sprite.name === name);
        }

        setColorProperties(args) {
            const system = this.systems.get(args.ID);
            if (system) {
                system.colors = args.COLORS.split(',').map(c => c.trim());
                system.startAlpha = args.ALPHA;
                system.blendMode = args.BLEND;
            }
        }
    }

    Scratch.extensions.register(new ParticleSystem());
})(Scratch); 