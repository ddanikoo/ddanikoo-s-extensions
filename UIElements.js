(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Расширение UI Elements должно быть запущено вне песочницы');
    }

    class UIElements {
        constructor() {
            this.elements = new Map();
            this.stage = null;
            this.container = null;
            this._setupStyles();
            this._findStage();
            this._setupContainer();
            this._setupResizeHandler();
        }

        _findStage() {
            // Ищем сцену TurboWarp
            const stageWrapper = document.querySelector('[class*="stage-wrapper_stage-wrapper"], [class*="stage_stage"]');
            if (!stageWrapper) return;

            // В полноэкранном режиме ищем внутренний контейнер
            const fullScreenTarget = stageWrapper.querySelector('[class*="stage_stage-wrapper-overlay"]');
            
            this.stage = fullScreenTarget || stageWrapper;
        }

        _setupContainer() {
            if (!this.stage) return;

            // Создаем контейнер для UI элементов
            this.container = document.createElement('div');
            this.container.id = 'scratch-ui-container';
            this.container.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999;
            `;
            this.stage.appendChild(this.container);
        }

        _setupStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .ui-element {
                    position: absolute;
                    transition: all 0.3s ease;
                    font-family: Arial, sans-serif;
                    transform: translate(-50%, -50%);
                    pointer-events: auto;
                }
                .ui-text {
                    pointer-events: none;
                    white-space: nowrap;
                    user-select: none;
                }
                .ui-button {
                    cursor: pointer;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    transition: transform 0.1s;
                    white-space: nowrap;
                    user-select: none;
                }
                .ui-button:hover {
                    transform: translate(-50%, -50%) scale(1.05);
                }
                .ui-button:active {
                    transform: translate(-50%, -50%) scale(0.95);
                }
            `;
            document.head.appendChild(style);
        }

        _convertToStageCoords(x, y) {
            if (!this.stage || !this.container) return { x: 0, y: 0 };

            const rect = this.stage.getBoundingClientRect();
            const stageWidth = rect.width;
            const stageHeight = rect.height;

            // Преобразуем координаты Scratch в пиксели
            const pixelX = (x + 240) * (stageWidth / 480);
            const pixelY = (180 - y) * (stageHeight / 360);

            return { x: pixelX, y: pixelY };
        }

        _setupResizeHandler() {
            window.addEventListener('resize', () => {
                this._findStage();
                if (!this.container) {
                    this._setupContainer();
                }
                this._updateAllElements();
            });

            document.addEventListener('fullscreenchange', () => {
                setTimeout(() => {
                    this._findStage();
                    if (!this.container) {
                        this._setupContainer();
                    }
                    this._updateAllElements();
                }, 100);
            });
        }

        _updateAllElements() {
            if (!this.container) return;
            
            for (const [id, element] of this.elements) {
                if (element.originalX !== undefined && element.originalY !== undefined) {
                    const coords = this._convertToStageCoords(element.originalX, element.originalY);
                    element.element.style.left = `${coords.x}px`;
                    element.element.style.top = `${coords.y}px`;

                    // Обновляем размер если он есть
                    if (element.originalSize) {
                        const newSize = this._getAdaptiveSize(element.originalSize);
                        element.element.style.fontSize = `${newSize}px`;
                    }
                }
            }
        }

        _getAdaptiveSize(baseSize) {
            if (!this.stage) return baseSize;
            const rect = this.stage.getBoundingClientRect();
            const scale = Math.min(rect.width / 480, rect.height / 360);
            return Math.round(baseSize * scale);
        }

        _getAlignedPosition(horizontal, vertical, customMarginX = 30, customMarginY = 25) {
            if (!this.stage) return { x: 0, y: 0 };

            // Используем пользовательские отступы или значения по умолчанию
            const marginX = customMarginX;
            const marginY = customMarginY;

            let x = 0;
            let y = 0;

            switch (horizontal) {
                case 'левый':
                    x = -240 + marginX;
                    break;
                case 'правый':
                    x = 240 - marginX;
                    break;
                case 'центр':
                default:
                    x = 0;
                    break;
            }

            switch (vertical) {
                case 'верхний':
                    y = 180 - marginY;
                    break;
                case 'нижний':
                    y = -180 + marginY;
                    break;
                case 'центр':
                default:
                    y = 0;
                    break;
            }

            return { x, y };
        }

        addText(args) {
            if (!this.container) this._setupContainer();
            if (!this.container) return;

            const id = args.ID;
            if (this.elements.has(id)) {
                this.removeElement({ ID: id });
            }

            const coords = this._convertToStageCoords(args.X, args.Y);
            const fontSize = this._getAdaptiveSize(args.SIZE);
            const text = document.createElement('div');
            text.className = 'ui-element ui-text';
            text.style.cssText = `
                left: ${coords.x}px;
                top: ${coords.y}px;
                font-family: ${args.FONT};
                font-size: ${fontSize}px;
                color: ${args.COLOR};
                position: absolute;
                transform: translate(-50%, -50%);
            `;
            text.textContent = args.TEXT;

            this.container.appendChild(text);
            this.elements.set(id, { 
                element: text, 
                type: 'text',
                originalX: args.X,
                originalY: args.Y,
                originalSize: args.SIZE
            });
        }

        addButton(args) {
            if (!this.container) this._setupContainer();
            if (!this.container) return;

            const id = args.ID;
            if (this.elements.has(id)) {
                this.removeElement({ ID: id });
            }

            const coords = this._convertToStageCoords(args.X, args.Y);
            const fontSize = this._getAdaptiveSize(16); // базовый размер шрифта для кнопки
            const padding = this._getAdaptiveSize(8);
            const button = document.createElement('button');
            button.className = 'ui-element ui-button';
            button.style.cssText = `
                left: ${coords.x}px;
                top: ${coords.y}px;
                background-color: ${args.BG};
                color: ${args.COLOR};
                position: absolute;
                transform: translate(-50%, -50%);
                font-size: ${fontSize}px;
                padding: ${padding}px ${padding * 2}px;
            `;
            button.textContent = args.TEXT;

            let isClicked = false;
            button.onclick = () => {
                isClicked = true;
                setTimeout(() => { isClicked = false; }, 50);
            };

            this.container.appendChild(button);
            this.elements.set(id, { 
                element: button, 
                type: 'button',
                isClicked: () => isClicked,
                originalX: args.X,
                originalY: args.Y
            });
        }

        moveElement(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                const coords = this._convertToStageCoords(args.X, args.Y);
                element.element.style.left = `${coords.x}px`;
                element.element.style.top = `${coords.y}px`;
                element.originalX = args.X;
                element.originalY = args.Y;
            }
        }

        updateText(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                element.element.textContent = args.TEXT;
            }
        }

        removeElement(args) {
            const element = this.elements.get(args.ID);
            if (element) {
                element.element.remove();
                this.elements.delete(args.ID);
            }
        }

        removeAllElements() {
            for (const [id] of this.elements) {
                this.removeElement({ ID: id });
            }
        }

        isButtonClicked(args) {
            const element = this.elements.get(args.ID);
            return element && element.type === 'button' && element.isClicked();
        }

        alignElement(args) {
            const element = this.elements.get(args.ID);
            if (!element) return;

            const marginX = args.MARGIN_X || 30;
            const marginY = args.MARGIN_Y || 25;
            
            const position = this._getAlignedPosition(args.HORIZONTAL, args.VERTICAL, marginX, marginY);
            const coords = this._convertToStageCoords(position.x, position.y);
            
            element.element.style.left = `${coords.x}px`;
            element.element.style.top = `${coords.y}px`;
            element.originalX = position.x;
            element.originalY = position.y;
        }

        getInfo() {
            return {
                id: 'uielements',
                name: 'UI Elements',
                color1: '#7C4DFF',
                color2: '#651FFF',
                blocks: [
                    {
                        opcode: 'addText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить текст [TEXT] с id [ID] позиция x: [X] y: [Y] размер: [SIZE] шрифт: [FONT] цвет: [COLOR]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Текст'
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
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
                                defaultValue: 16
                            },
                            FONT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'fontMenu'
                            },
                            COLOR: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#000000'
                            }
                        }
                    },
                    {
                        opcode: 'addButton',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить кнопку [TEXT] с id [ID] позиция x: [X] y: [Y] цвет фона: [BG] цвет текста: [COLOR]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Кнопка'
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'button1'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            BG: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#4C97FF'
                            },
                            COLOR: {
                                type: Scratch.ArgumentType.COLOR,
                                defaultValue: '#FFFFFF'
                            }
                        }
                    },
                    {
                        opcode: 'updateText',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'изменить текст элемента [ID] на [TEXT]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Новый текст'
                            }
                        }
                    },
                    {
                        opcode: 'moveElement',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'переместить элемент [ID] x: [X] y: [Y]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
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
                        opcode: 'removeElement',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить элемент [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
                            }
                        }
                    },
                    {
                        opcode: 'removeAllElements',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить все элементы'
                    },
                    {
                        opcode: 'isButtonClicked',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'кнопка [ID] нажата?',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'button1'
                            }
                        }
                    },
                    {
                        opcode: 'alignElement',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'поставить [ID] в [HORIZONTAL] [VERTICAL] экрана отступ по X: [MARGIN_X] по Y: [MARGIN_Y]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
                            },
                            HORIZONTAL: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'horizontalMenu'
                            },
                            VERTICAL: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'verticalMenu'
                            },
                            MARGIN_X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 30
                            },
                            MARGIN_Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 25
                            }
                        }
                    },
                    {
                        opcode: 'getElementX',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'x координата [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
                            }
                        }
                    },
                    {
                        opcode: 'getElementY',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'y координата [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text1'
                            }
                        }
                    }
                ],
                menus: {
                    fontMenu: {
                        acceptReporters: false,
                        items: ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Comic Sans MS']
                    },
                    horizontalMenu: {
                        acceptReporters: false,
                        items: ['левый', 'центр', 'правый']
                    },
                    verticalMenu: {
                        acceptReporters: false,
                        items: ['верхний', 'центр', 'нижний']
                    }
                }
            };
        }

        getElementX(args) {
            const element = this.elements.get(args.ID);
            if (!element || element.originalX === undefined) return 0;
            return element.originalX;
        }

        getElementY(args) {
            const element = this.elements.get(args.ID);
            if (!element || element.originalY === undefined) return 0;
            return element.originalY;
        }
    }

    Scratch.extensions.register(new UIElements());
})(Scratch); 