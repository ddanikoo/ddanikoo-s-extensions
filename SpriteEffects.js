(function(Scratch) {
    'use strict';

    class SpriteEffects {
        constructor() {
            this.effects = new Map();
            this.runtime = Scratch.vm.runtime;
            this.lastUpdate = Date.now();
            this.setupCanvas();
            this.startRenderLoop();
        }

        setupCanvas() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            const scratchCanvas = this.runtime.renderer.canvas;
            this.canvas.width = scratchCanvas.width;
            this.canvas.height = scratchCanvas.height;
            
            scratchCanvas.parentElement.insertBefore(this.canvas, scratchCanvas.nextSibling);
            this.canvas.style.position = 'absolute';
            this.canvas.style.pointerEvents = 'none';
            this.updateCanvasPosition();

            window.addEventListener('resize', () => this.updateCanvasPosition());
        }

        updateCanvasPosition() {
            const scratchCanvas = this.runtime.renderer.canvas;
            const rect = scratchCanvas.getBoundingClientRect();
            this.canvas.style.top = rect.top + 'px';
            this.canvas.style.left = rect.left + 'px';
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        }

        startRenderLoop() {
            const render = () => {
                const now = Date.now();
                const deltaTime = (now - this.lastUpdate) / 1000;
                this.lastUpdate = now;

                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                for (const [id, effect] of this.effects) {
                    if (effect.active) {
                        this.updateEffect(effect, deltaTime);
                        this.renderEffect(effect);
                    } else {
                        this.effects.delete(id);
                    }
                }

                requestAnimationFrame(render);
            };
            render();
        }

        createTrailEffect(args) {
            const sprite = this.runtime.getSpriteTargetByName(args.SPRITE);
            if (!sprite) return false;

            const effect = {
                id: args.ID,
                type: 'trail',
                sprite: sprite,
                color: args.COLOR || '#ffffff',
                length: args.LENGTH || 10,
                fade: args.FADE || true,
                points: [],
                active: true,
                opacity: args.OPACITY || 0.5
            };

            this.effects.set(args.ID, effect);
            return true;
        }

        createParticleEffect(args) {
            const sprite = this.runtime.getSpriteTargetByName(args.SPRITE);
            if (!sprite) return false;

            const effect = {
                id: args.ID,
                type: 'particles',
                sprite: sprite,
                color: args.COLOR || '#ffffff',
                count: args.COUNT || 20,
                size: args.SIZE || 5,
                speed: args.SPEED || 100,
                lifetime: args.LIFETIME || 1,
                particles: [],
                active: true,
                emitting: true
            };

            // Создаем начальные частицы
            for (let i = 0; i < effect.count; i++) {
                this.createParticle(effect);
            }

            this.effects.set(args.ID, effect);
            return true;
        }

        createParticle(effect) {
            const angle = Math.random() * Math.PI * 2;
            const speed = effect.speed * (0.5 + Math.random() * 0.5);
            
            effect.particles.push({
                x: effect.sprite.x,
                y: effect.sprite.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: effect.lifetime,
                maxLife: effect.lifetime,
                size: effect.size * (0.5 + Math.random() * 0.5)
            });
        }

        updateEffect(effect, deltaTime) {
            switch (effect.type) {
                case 'trail':
                    // Добавляем новую точку
                    effect.points.unshift({
                        x: effect.sprite.x,
                        y: effect.sprite.y,
                        opacity: 1
                    });

                    // Удаляем лишние точки
                    if (effect.points.length > effect.length) {
                        effect.points.pop();
                    }

                    // Обновляем прозрачность
                    if (effect.fade) {
                        effect.points.forEach((point, index) => {
                            point.opacity = 1 - (index / effect.length);
                        });
                    }
                    break;

                case 'particles':
                    // Обновляем существующие частицы
                    effect.particles = effect.particles.filter(particle => {
                        particle.x += particle.vx * deltaTime;
                        particle.y += particle.vy * deltaTime;
                        particle.life -= deltaTime;
                        return particle.life > 0;
                    });

                    // Создаем новые частицы
                    if (effect.emitting) {
                        while (effect.particles.length < effect.count) {
                            this.createParticle(effect);
                        }
                    }
                    break;
            }
        }

        renderEffect(effect) {
            const canvas = this.runtime.renderer.canvas;
            const scale = this.canvas.width / canvas.width;
            const offsetX = this.canvas.width / 2;
            const offsetY = this.canvas.height / 2;

            this.ctx.save();
            
            switch (effect.type) {
                case 'trail':
                    if (effect.points.length < 2) break;
                    
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = effect.color;
                    this.ctx.lineWidth = 3 * scale;
                    
                    for (let i = 0; i < effect.points.length - 1; i++) {
                        const p1 = effect.points[i];
                        const p2 = effect.points[i + 1];
                        
                        this.ctx.globalAlpha = p1.opacity * effect.opacity;
                        this.ctx.moveTo(offsetX + p1.x * scale, offsetY - p1.y * scale);
                        this.ctx.lineTo(offsetX + p2.x * scale, offsetY - p2.y * scale);
                    }
                    
                    this.ctx.stroke();
                    break;

                case 'particles':
                    this.ctx.fillStyle = effect.color;
                    
                    effect.particles.forEach(particle => {
                        this.ctx.globalAlpha = (particle.life / particle.maxLife) * effect.opacity;
                        this.ctx.beginPath();
                        this.ctx.arc(
                            offsetX + particle.x * scale,
                            offsetY - particle.y * scale,
                            particle.size * scale,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                    });
                    break;
            }
            
            this.ctx.restore();
        }

        removeEffect(args) {
            return this.effects.delete(args.ID);
        }

        getInfo() {
            return {
                id: 'spriteeffects',
                name: 'Sprite Effects',
                color1: '#FF6B9E',
                color2: '#FF4D8B',
                blocks: [
                    {
                        opcode: 'createTrailEffect',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать след [ID] для спрайта [SPRITE] цвет [COLOR] длина [LENGTH] прозрачность [OPACITY]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'trail1'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'sprites'
                            },
                            COLOR: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#ffffff'
                            },
                            LENGTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            },
                            OPACITY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0.5
                            }
                        }
                    },
                    {
                        opcode: 'createParticleEffect',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать частицы [ID] для спрайта [SPRITE] цвет [COLOR] количество [COUNT] размер [SIZE] скорость [SPEED] время жизни [LIFETIME]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'particles1'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'sprites'
                            },
                            COLOR: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#ffffff'
                            },
                            COUNT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            },
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 5
                            },
                            SPEED: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            },
                            LIFETIME: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'removeEffect',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить эффект [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'effect1'
                            }
                        }
                    }
                ],
                menus: {
                    sprites: {
                        acceptReporters: false,
                        items: 'getSpriteMenu'
                    }
                }
            };
        }

        getSpriteMenu() {
            const sprites = [];
            for (const target of this.runtime.targets) {
                if (!target.isStage) {
                    sprites.push(target.sprite.name);
                }
            }
            return sprites;
        }
    }

    Scratch.extensions.register(new SpriteEffects());
})(Scratch); 