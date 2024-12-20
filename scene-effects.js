class SceneEffects {
    constructor() {
        this.canvas = null;
        this.originalStyle = '';
        this.animationFrame = null;
        this.effectTime = 0;
    }

    getInfo() {
        return {
            id: 'sceneEffects',
            name: 'Эффекты сцены',
            blocks: [
                {
                    opcode: 'setVHSEffect',
                    blockType: 'command',
                    text: 'VHS эффект шум [noise] искажение [distortion]',
                    arguments: {
                        noise: {
                            type: 'number',
                            defaultValue: 50
                        },
                        distortion: {
                            type: 'number',
                            defaultValue: 30
                        }
                    }
                },
                {
                    opcode: 'setGlitchEffect',
                    blockType: 'command',
                    text: 'глитч интенсивность [intensity]',
                    arguments: {
                        intensity: {
                            type: 'number',
                            defaultValue: 50
                        }
                    }
                },
                {
                    opcode: 'setOldFilmEffect',
                    blockType: 'command',
                    text: 'старый фильм контраст [contrast]',
                    arguments: {
                        contrast: {
                            type: 'number',
                            defaultValue: 50
                        }
                    }
                },
                {
                    opcode: 'clearEffects',
                    blockType: 'command',
                    text: 'убрать эффекты'
                }
            ]
        };
    }

    setVHSEffect({noise, distortion}) {
        this._initCanvas();
        this.clearEffects();

        const n = noise / 100;
        const d = distortion / 100;

        // Создаем элемент для шума
        const noiseOverlay = document.createElement('div');
        noiseOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            mix-blend-mode: overlay;
            opacity: ${n};
            z-index: 1000;
        `;
        this.canvas.parentElement.appendChild(noiseOverlay);

        const animate = () => {
            this.effectTime += 0.05;
            
            // Генерируем шум
            noiseOverlay.style.backgroundImage = `
                repeating-radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, 
                    rgba(0,0,0,0.3) 0%, 
                    transparent 1%, 
                    rgba(0,0,0,0.3) 2%
                ),
                repeating-linear-gradient(
                    ${Math.random() * 360}deg,
                    transparent 0%,
                    rgba(255,255,255,0.1) ${Math.random() * 0.1}%,
                    transparent ${Math.random() * 0.2}%,
                    rgba(0,0,0,0.2) ${Math.random() * 0.3}%
                )
            `;

            // Вертикальное смещение и искажения
            const jitterY = (Math.random() - 0.5) * d * 10;
            const jitterX = (Math.random() - 0.5) * d * 5;
            const skew = Math.sin(this.effectTime * 2) * d * 2;
            
            this.canvas.style.transform = `
                translate(${jitterX}px, ${jitterY}px)
                skewX(${skew}deg)
            `;

            // Цветовые искажения и эффекты
            this.canvas.style.filter = `
                brightness(1.2)
                contrast(1.3)
                saturate(1.5)
                blur(${n * 1.5}px)
                hue-rotate(${Math.sin(this.effectTime) * 5}deg)
            `;

            // Линии развертки
            const scanlineGradient = `
                repeating-linear-gradient(
                    0deg,
                    transparent 0%,
                    transparent 50%,
                    rgba(0, 0, 0, ${0.2 * d}) 50%,
                    rgba(0, 0, 0, ${0.2 * d}) 51%,
                    transparent 51%,
                    transparent 100%
                )
            `;
            this.canvas.style.backgroundImage = scanlineGradient;
            this.canvas.style.backgroundSize = '100% 4px';
            this.canvas.style.backgroundPosition = `0 ${this.effectTime * 20}px`;

            // Случайные помехи
            if (Math.random() < d * 0.3) {
                this.canvas.style.filter += ` 
                    brightness(${1.5 + Math.random()})
                    contrast(${2 + Math.random()})
                    hue-rotate(${Math.random() * 360}deg)
                `;
                this.canvas.style.transform += ` scaleY(${1 + Math.random() * 0.1})`;
            }

            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    setGlitchEffect({intensity}) {
        this._initCanvas();
        this.clearEffects();

        const i = intensity / 100;

        const animate = () => {
            this.effectTime += 0.1;
            
            if (Math.random() < i) {
                const offsetX = (Math.random() - 0.5) * i * 50;
                const offsetY = (Math.random() - 0.5) * i * 20;
                const hue = Math.random() * 360;
                
                this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                this.canvas.style.filter = `
                    hue-rotate(${hue}deg)
                    saturate(2)
                    contrast(1.5)
                `;
            } else {
                this.canvas.style.transform = 'none';
                this.canvas.style.filter = 'none';
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    setOldFilmEffect({contrast}) {
        this._initCanvas();
        this.clearEffects();

        const c = contrast / 100;

        const animate = () => {
            this.effectTime += 0.05;
            const grainAmount = Math.random() * c * 10;
            
            this.canvas.style.filter = `
                grayscale(0.8)
                sepia(0.3)
                contrast(${1 + c})
                brightness(${0.9 + Math.random() * 0.2})
                blur(${grainAmount}px)
            `;
            
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    clearEffects() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.canvas) {
            this.canvas.style.filter = 'none';
            this.canvas.style.transform = 'none';
            this.canvas.style.backgroundImage = 'none';
            this.canvas.style.animation = 'none';
        }

        // Удаляем слой шума
        const noiseOverlay = this.canvas.parentElement.querySelector('div');
        if (noiseOverlay) {
            noiseOverlay.remove();
        }
        
        this.effectTime = 0;
    }

    _initCanvas() {
        if (!this.canvas) {
            this.canvas = Scratch.renderer.canvas;
            this.originalStyle = this.canvas.style.cssText;
            
            // Добавляем стили для плавных переходов
            this.canvas.style.transition = 'filter 0.1s';
        }
    }
}

Scratch.extensions.register(new SceneEffects()); 