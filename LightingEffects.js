(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Расширение Lighting Effects должно быть запущено вне песочницы');
    }

    class LightingEffects {
        constructor() {
            this.lights = new Map();
            this.beams = new Map();
            this.spriteShadows = new Map();
            this._setupRenderer();
            this._setupResizeHandler();
        }

        _setupRenderer() {
            // Ждем инициализации рендерера Scratch
            const vm = Scratch.vm;
            if (!vm || !vm.runtime || !vm.runtime.renderer) {
                setTimeout(() => this._setupRenderer(), 100);
                return;
            }

            this.renderer = vm.runtime.renderer;
            this.canvas = this.renderer.canvas;

            // Создаем canvas для эффектов освещения
            this.lightCanvas = document.createElement('canvas');
            this.lightCtx = this.lightCanvas.getContext('2d');
            
            // Устанавливаем ра��меры
            this._updateCanvasSize();

            // Добавляем canvas на сцену
            if (this.canvas.parentElement) {
                this.canvas.parentElement.insertBefore(this.lightCanvas, this.canvas.nextSibling);
                this.lightCanvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    mix-blend-mode: multiply;
                    pointer-events: none;
                    z-index: 2;
                `;
            }

            // Запускаем рендеринг
            this._startRendering();
        }

        _setupResizeHandler() {
            window.addEventListener('resize', () => {
                this._updateCanvasSize();
            });
        }

        _updateCanvasSize() {
            if (!this.lightCanvas || !this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            this.lightCanvas.width = rect.width;
            this.lightCanvas.height = rect.height;
            this.width = rect.width;
            this.height = rect.height;
        }

        _startRendering() {
            const render = () => {
                this._renderFrame();
                this.animationFrame = requestAnimationFrame(render);
            };
            render();
        }

        _renderFrame() {
            if (!this.lightCtx || !this.width || !this.height) return;

            // Очищаем canvas
            this.lightCtx.clearRect(0, 0, this.width, this.height);

            // Рисуем фоновое затемнение
            this.lightCtx.globalCompositeOperation = 'source-over';
            this.lightCtx.fillStyle = `rgba(0, 0, 0, ${(100 - (this.ambientIntensity || 0)) / 100})`;
            this.lightCtx.fillRect(0, 0, this.width, this.height);

            // Рисуем источники света
            this.lightCtx.globalCompositeOperation = 'destination-out';
            for (const light of this.lights.values()) {
                this._renderLight(light);
            }

            // Рисуем лучи света
            for (const beam of this.beams.values()) {
                this._renderBeam(beam);
            }
        }

        _renderLight(light) {
            const pos = this._convertToCanvasCoords(light.x, light.y);
            const radius = light.size * pos.scale;

            const gradient = this.lightCtx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, radius
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${light.intensity / 100})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.lightCtx.beginPath();
            this.lightCtx.fillStyle = gradient;
            this.lightCtx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            this.lightCtx.fill();
        }

        _renderBeam(beam) {
            const pos = this._convertToCanvasCoords(beam.x, beam.y);
            const angle = beam.angle * (Math.PI / 180);
            const length = beam.length * pos.scale;
            const width = beam.width * pos.scale;

            this.lightCtx.save();
            this.lightCtx.translate(pos.x, pos.y);
            this.lightCtx.rotate(angle);

            const gradient = this.lightCtx.createLinearGradient(0, 0, length, 0);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${beam.intensity / 100})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.lightCtx.fillStyle = gradient;
            this.lightCtx.beginPath();
            this.lightCtx.moveTo(0, -width/2);
            this.lightCtx.lineTo(length, -width/4);
            this.lightCtx.lineTo(length, width/4);
            this.lightCtx.lineTo(0, width/2);
            this.lightCtx.closePath();
            this.lightCtx.fill();

            this.lightCtx.restore();
        }

        _convertToCanvasCoords(x, y) {
            const scale = Math.min(this.width / 480, this.height / 360);
            return {
                x: this.width/2 + x * scale,
                y: this.height/2 - y * scale,
                scale: scale
            };
        }

        // Методы для блоков
        addLight(args) {
            this.lights.set(args.ID, {
                x: args.X,
                y: args.Y,
                size: args.SIZE,
                intensity: args.INTENSITY
            });
        }

        setAmbientLight(args) {
            this.ambientIntensity = args.INTENSITY;
        }

        removeLight(args) {
            this.lights.delete(args.ID);
        }

        addBeam(args) {
            this.beams.set(args.ID, {
                x: args.X,
                y: args.Y,
                angle: args.ANGLE,
                length: args.LENGTH,
                width: args.WIDTH,
                intensity: args.INTENSITY
            });
        }

        removeBeam(args) {
            this.beams.delete(args.ID);
        }

        removeAllEffects() {
            this.lights.clear();
            this.beams.clear();
            this.ambientIntensity = 100;
        }

        getInfo() {
            return {
                id: 'lightingeffects',
                name: 'Освещение',
                color1: '#FFD700',
                color2: '#FFA500',
                blocks: [
                    {
                        opcode: 'addLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить свет [ID] x: [X] y: [Y] размер: [SIZE] яркость: [INTENSITY]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 50
                            },
                            INTENSITY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: 'setAmbientLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить общее освещение [INTENSITY]%',
                        arguments: {
                            INTENSITY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: 'addBeam',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить луч света [ID] x: [X] y: [Y] угол: [ANGLE] длина: [LENGTH] ширина: [WIDTH] яркость: [INTENSITY]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'beam1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            ANGLE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            LENGTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            },
                            WIDTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            },
                            INTENSITY: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },
                    {
                        opcode: 'removeLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить свет [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'removeBeam',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить луч света [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'beam1'
                            }
                        }
                    },
                    {
                        opcode: 'removeAllEffects',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить все эффекты освещения'
                    },
                    {
                        opcode: 'getLightX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'x координата света [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'getLightY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'y коор��ината света [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'getLightIntensity',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'яркость света [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'getAmbientLight',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'общее освещение'
                    },
                    {
                        opcode: 'isLightExists',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'существует свет [ID]?',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'moveToLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'переместить спрайт к свету [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'pointToLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'повернуть спрайт к свету [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'setLightToSprite',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'привязать свет [ID] к этому спрайту',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            }
                        }
                    },
                    {
                        opcode: 'changeLightIntensity',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'изменить яркость света [ID] на [CHANGE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            },
                            CHANGE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },
                    {
                        opcode: 'changeLightSize',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'изменить размер света [ID] на [CHANGE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            },
                            CHANGE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },
                    {
                        opcode: 'moveLightSmooth',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'плавно переместить свет [ID] к x: [X] y: [Y] за [DURATION] секунд',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            DURATION: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'moveBeamSmooth',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'плавно переместить луч [ID] к x: [X] y: [Y] угол: [ANGLE] за [DURATION] секунд',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'beam1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            ANGLE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            DURATION: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'moveLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'переместить свет [ID] x: [X] y: [Y]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'light1'
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
                        opcode: 'moveBeam',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'переместить луч [ID] x: [X] y: [Y] угол: [ANGLE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'beam1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            ANGLE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    }
                ]
            };
        }

        // Добавляем метод очистки при удале��ии расширения
        _shutdown() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            if (this.lightCanvas && this.lightCanvas.parentElement) {
                this.lightCanvas.parentElement.removeChild(this.lightCanvas);
            }
        }

        // Добавляем методы для новых блоков
        getLightX(args) {
            const light = this.lights.get(args.ID);
            return light ? light.x : 0;
        }

        getLightY(args) {
            const light = this.lights.get(args.ID);
            return light ? light.y : 0;
        }

        getLightIntensity(args) {
            const light = this.lights.get(args.ID);
            return light ? light.intensity : 0;
        }

        getAmbientLight() {
            return this.ambientIntensity || 100;
        }

        isLightExists(args) {
            return this.lights.has(args.ID);
        }

        moveToLight(args) {
            const light = this.lights.get(args.ID);
            const target = vm.runtime.getTargetForStage().sprite.clones[0];
            if (light && target) {
                target.setXY(light.x, light.y);
            }
        }

        pointToLight(args) {
            const light = this.lights.get(args.ID);
            const target = vm.runtime.getTargetForStage().sprite.clones[0];
            if (light && target) {
                const dx = light.x - target.x;
                const dy = light.y - target.y;
                const direction = Math.atan2(dy, dx) * 180 / Math.PI + 90;
                target.setDirection(direction);
            }
        }

        setLightToSprite(args) {
            const target = vm.runtime.getTargetForStage().sprite.clones[0];
            if (target) {
                const light = this.lights.get(args.ID);
                if (light) {
                    light.x = target.x;
                    light.y = target.y;
                } else {
                    this.addLight({
                        ID: args.ID,
                        X: target.x,
                        Y: target.y,
                        SIZE: 50,
                        INTENSITY: 100
                    });
                }
            }
        }

        changeLightIntensity(args) {
            const light = this.lights.get(args.ID);
            if (light) {
                light.intensity = Math.max(0, Math.min(100, light.intensity + args.CHANGE));
            }
        }

        changeLightSize(args) {
            const light = this.lights.get(args.ID);
            if (light) {
                light.size = Math.max(1, light.size + args.CHANGE);
            }
        }

        moveLight(args) {
            const light = this.lights.get(args.ID);
            if (light) {
                light.x = args.X;
                light.y = args.Y;
            }
        }

        moveBeam(args) {
            const beam = this.beams.get(args.ID);
            if (beam) {
                beam.x = args.X;
                beam.y = args.Y;
                beam.angle = args.ANGLE;
            }
        }

        moveLightSmooth(args) {
            const light = this.lights.get(args.ID);
            if (!light) return;

            const startX = light.x;
            const startY = light.y;
            const endX = args.X;
            const endY = args.Y;
            const duration = args.DURATION * 1000; // переводим в миллисекунды
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Используем плавную функцию анимации
                const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

                light.x = startX + (endX - startX) * easeProgress;
                light.y = startY + (endY - startY) * easeProgress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
        }

        moveBeamSmooth(args) {
            const beam = this.beams.get(args.ID);
            if (!beam) return;

            const startX = beam.x;
            const startY = beam.y;
            const startAngle = beam.angle;
            const endX = args.X;
            const endY = args.Y;
            const endAngle = args.ANGLE;
            const duration = args.DURATION * 1000;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Используем плавную функцию анимации
                const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

                beam.x = startX + (endX - startX) * easeProgress;
                beam.y = startY + (endY - startY) * easeProgress;
                beam.angle = startAngle + (endAngle - startAngle) * easeProgress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
        }
    }

    // Определяем класс для рейкастинга
    class RayCaster {
        constructor() {
            this.rays = [];
        }

        // Метод для создания лучей
        castRays(origin, angle, numRays) {
            this.rays = [];
            for (let i = 0; i < numRays; i++) {
                let rayAngle = angle + (i - numRays / 2) * (Math.PI / numRays);
                this.rays.push(this.castRay(origin, rayAngle));
            }
        }

        // Метод для отрисовки лучей
        castRay(origin, angle) {
            // Логика для определения пересечения луча с объектами
            // ... существующий код ...
            return intersectionPoint; // Возвращаем точку пересечения
        }

        // Метод для отрисовки теней
        drawShadows(context) {
            // Логика для отрисовки теней на основе лучей
            // ... существующий код ...
        }
    }

    // Регистрируем расширение
    const extension = new LightingEffects();
    Scratch.extensions.register(extension);

    // Добавляем обработчик для очистки при перезагрузке
    window.addEventListener('beforeunload', () => {
        extension._shutdown();
    });

})(Scratch); 