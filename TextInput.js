(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Расширение Text Input должно быть запущено вне песочницы');
    }

    class TextInput {
        constructor() {
            this.inputValue = '';
            this.isVisible = false;
            this.x = 50;
            this.y = 90;
            this._setupInput();
        }

        _setupInput() {
            // Создаем контейнер для поля ввода
            this.container = document.createElement('div');
            this.container.id = 'scratch-text-input';
            this.container.style.cssText = `
                position: fixed;
                left: ${this.x}%;
                bottom: ${this.y}%;
                transform: translate(-50%, 50%);
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: none;
                z-index: 9999;
            `;

            // Создаем поле ввода
            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.placeholder = 'Введите текст...';
            this.input.style.cssText = `
                width: 200px;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                outline: none;
            `;

            // Создаем кнопку подтверждения
            this.button = document.createElement('button');
            this.button.textContent = 'OK';
            this.button.style.cssText = `
                margin-left: 8px;
                padding: 8px 16px;
                background: #4C97FF;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 14px;
            `;

            // Добавляем обработчики событий
            this.button.onclick = () => this._handleInput();
            this.input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this._handleInput();
                }
            };

            // Собираем всё вместе
            this.container.appendChild(this.input);
            this.container.appendChild(this.button);
            document.body.appendChild(this.container);
        }

        _updatePosition() {
            this.container.style.left = `${this.x}%`;
            this.container.style.bottom = `${this.y}%`;
        }

        _handleInput() {
            this.inputValue = this.input.value;
            this.input.value = '';
            this.hideInput();
        }

        getInfo() {
            return {
                id: 'textinput',
                name: 'Ввод текста',
                color1: '#4C97FF',
                color2: '#3373CC',
                blocks: [
                    {
                        opcode: 'showInput',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'показать поле ввода с текстом [TEXT] в позиции x: [X] y: [Y]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Введите текст...'
                            },
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 50
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 90
                            }
                        }
                    },
                    {
                        opcode: 'setPosition',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить позицию поля ввода x: [X] y: [Y]',
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 50
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 90
                            }
                        }
                    },
                    {
                        opcode: 'hideInput',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'скрыть поле ввода'
                    },
                    {
                        opcode: 'getInputValue',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'введённый текст'
                    },
                    {
                        opcode: 'clearInputValue',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'очистить введённый текст'
                    },
                    {
                        opcode: 'isInputVisible',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'поле ввода видимо?'
                    }
                ]
            };
        }

        showInput(args) {
            this.isVisible = true;
            this.x = Math.max(0, Math.min(args.X, 100));
            this.y = Math.max(0, Math.min(args.Y, 100));
            this._updatePosition();
            this.container.style.display = 'block';
            this.input.placeholder = args.TEXT;
            this.input.focus();
        }

        setPosition(args) {
            this.x = Math.max(0, Math.min(args.X, 100));
            this.y = Math.max(0, Math.min(args.Y, 100));
            this._updatePosition();
        }

        hideInput() {
            this.isVisible = false;
            this.container.style.display = 'none';
        }

        getInputValue() {
            return this.inputValue;
        }

        clearInputValue() {
            this.inputValue = '';
        }

        isInputVisible() {
            return this.isVisible;
        }
    }

    Scratch.extensions.register(new TextInput());
})(Scratch); 