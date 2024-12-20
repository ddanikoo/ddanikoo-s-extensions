(function(Scratch) {
    'use strict';

    class GameUI {
        constructor() {
            this.elements = new Map();
            this.runtime = Scratch.vm.runtime;
            this.buttonStates = new Map();
            this.setupUI();
        }

        setupUI() {
            // Создаем основной контейнер
            const canvas = this.runtime.renderer.canvas;
            const canvasWrapper = canvas.parentElement;

            this.wrapper = document.createElement('div');
            this.wrapper.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 100;
            `;
            canvasWrapper.appendChild(this.wrapper);

            // Создаем слой для UI элементов
            this.uiLayer = document.createElement('div');
            this.uiLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;
            this.wrapper.appendChild(this.uiLayer);

            // Обработчики изменения размера и режима отображения
            window.addEventListener('resize', () => this.updateLayout());
            document.addEventListener('fullscreenchange', () => this.updateLayout());
            this.updateLayout();

            // Обработка кликов
            this.wrapper.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.wrapper.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.wrapper.addEventListener('mouseleave', () => this.handleMouseLeave());
        }

        updateLayout() {
            const canvas = this.runtime.renderer.canvas;
            const rect = canvas.getBoundingClientRect();
            const scale = rect.width / canvas.width;

            this.wrapper.style.width = `${rect.width}px`;
            this.wrapper.style.height = `${rect.height}px`;
            this.wrapper.style.left = `${rect.left}px`;
            this.wrapper.style.top = `${rect.top}px`;

            this.uiScale = scale;
            this.uiLayer.style.transform = `scale(${scale})`;
            this.uiLayer.style.transformOrigin = 'top left';

            // Обновляем позиции всех элементов
            for (const [id, element] of this.elements) {
                this.updateElementPosition(element);
            }
        }

        updateElementPosition(element) {
            const pos = this.scratchToScreen(element.scratchX, element.scratchY);
            element.dom.style.left = `${pos.x}px`;
            element.dom.style.top = `${pos.y}px`;
        }

        scratchToScreen(x, y) {
            const canvas = this.runtime.renderer.canvas;
            return {
                x: (canvas.width / 2) + x,
                y: (canvas.height / 2) - y
            };
        }

        handleMouseDown(e) {
            const element = this.findElementAtPosition(e.clientX, e.clientY);
            if (element && element.type === 'button') {
                this.buttonStates.set(element.id, true);
                element.dom.classList.add('pressed');
            }
        }

        handleMouseUp(e) {
            for (const [id, pressed] of this.buttonStates) {
                if (pressed) {
                    const element = this.elements.get(id);
                    if (element) {
                        element.dom.classList.remove('pressed');
                        this.buttonStates.set(id, false);
                    }
                }
            }
        }

        handleMouseLeave() {
            this.handleMouseUp();
        }

        findElementAtPosition(x, y) {
            const rect = this.wrapper.getBoundingClientRect();
            const relX = (x - rect.left) / this.uiScale;
            const relY = (y - rect.top) / this.uiScale;

            for (const element of this.elements.values()) {
                const elRect = element.dom.getBoundingClientRect();
                const elX = (elRect.left - rect.left) / this.uiScale;
                const elY = (elRect.top - rect.top) / this.uiScale;
                
                if (relX >= elX && relX <= elX + elRect.width / this.uiScale &&
                    relY >= elY && relY <= elY + elRect.height / this.uiScale) {
                    return element;
                }
            }
            return null;
        }

        createButton(args) {
            const button = document.createElement('button');
            const pos = this.scratchToScreen(args.X, args.Y);

            button.style.cssText = `
                position: absolute;
                left: ${pos.x}px;
                top: ${pos.y}px;
                transform: translate(-50%, -50%);
                background: ${args.COLOR || '#4CAF50'};
                color: white;
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-family: sans-serif;
                font-size: 14px;
                cursor: pointer;
                pointer-events: auto;
                transition: transform 0.1s;
                user-select: none;
            `;
            button.textContent = args.TEXT;

            const element = {
                id: args.ID,
                type: 'button',
                dom: button,
                scratchX: args.X,
                scratchY: args.Y
            };

            this.elements.set(args.ID, element);
            this.uiLayer.appendChild(button);
            return true;
        }

        createText(args) {
            const text = document.createElement('div');
            const pos = this.scratchToScreen(args.X, args.Y);

            text.style.cssText = `
                position: absolute;
                left: ${pos.x}px;
                top: ${pos.y}px;
                transform: translate(-50%, -50%);
                color: ${args.COLOR || 'white'};
                font-family: ${args.FONT || 'sans-serif'};
                font-size: ${args.SIZE || 14}px;
                pointer-events: none;
                user-select: none;
                text-align: center;
            `;
            text.textContent = args.TEXT;

            const element = {
                id: args.ID,
                type: 'text',
                dom: text,
                scratchX: args.X,
                scratchY: args.Y
            };

            this.elements.set(args.ID, element);
            this.uiLayer.appendChild(text);
            return true;
        }

        removeElement(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                element.dom.remove();
                this.elements.delete(args.ID);
                this.buttonStates.delete(args.ID);
                return true;
            }
            return false;
        }

        isButtonPressed(args) {
            return this.buttonStates.get(args.ID) || false;
        }

        setElementText(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                element.dom.textContent = args.TEXT;
                return true;
            }
            return false;
        }

        setElementColor(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                if (element.type === 'button') {
                    element.dom.style.background = args.COLOR;
                } else if (element.type === 'text') {
                    element.dom.style.color = args.COLOR;
                }
                return true;
            }
            return false;
        }

        getInfo() {
            return {
                id: 'gameui',
                name: 'Game UI',
                color1: '#4CAF50',
                color2: '#45a049',
                blocks: [
                    {
                        opcode: 'createButton',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать кнопку [ID] текст [TEXT] x: [X] y: [Y] цвет [COLOR]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'button1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Кнопка' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#4CAF50' }
                        }
                    },
                    {
                        opcode: 'createText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать текст [ID] [TEXT] x: [X] y: [Y] цвет [COLOR] размер [SIZE]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Текст' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff' },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 14 }
                        }
                    },
                    {
                        opcode: 'removeElement',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить элемент [ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'button1' }
                        }
                    },
                    {
                        opcode: 'isButtonPressed',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'кнопка [ID] нажата?',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'button1' }
                        }
                    },
                    {
                        opcode: 'setElementText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'изменить текст [ID] на [TEXT]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'text1' },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Новый текст' }
                        }
                    },
                    {
                        opcode: 'setElementColor',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'изменить цвет [ID] на [COLOR]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'button1' },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#4CAF50' }
                        }
                    }
                ]
            };
        }
    }

    Scratch.extensions.register(new GameUI());
})(Scratch); 