(function(Scratch) {
    'use strict';

    class DialogSystem {
        constructor() {
            this.dialogs = new Map();
            this.currentDialog = null;
            this.dialogHistory = [];
            this.choices = [];
            this.variables = new Map();
            this.setupDialogBox();
        }

        setupDialogBox() {
            this.dialogBox = document.createElement('div');
            this.dialogBox.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                width: 80%;
                max-width: 800px;
                font-family: Arial, sans-serif;
                display: none;
                z-index: 9999;
                animation: dialogFade 0.3s;
            `;

            this.nameTag = document.createElement('div');
            this.nameTag.style.cssText = `
                position: absolute;
                top: -15px;
                left: 20px;
                background: #4CAF50;
                padding: 5px 15px;
                border-radius: 15px;
                font-weight: bold;
            `;

            this.textContent = document.createElement('div');
            this.textContent.style.cssText = `
                margin-top: 10px;
                line-height: 1.5;
                font-size: 16px;
            `;

            this.choicesContainer = document.createElement('div');
            this.choicesContainer.style.cssText = `
                margin-top: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;

            this.dialogBox.appendChild(this.nameTag);
            this.dialogBox.appendChild(this.textContent);
            this.dialogBox.appendChild(this.choicesContainer);
            document.body.appendChild(this.dialogBox);

            // Добавляем стили анимации
            const style = document.createElement('style');
            style.textContent = `
                @keyframes dialogFade {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes textType {
                    from { width: 0; }
                    to { width: 100%; }
                }
                .dialog-choice {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 10px;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .dialog-choice:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `;
            document.head.appendChild(style);
        }

        createDialog(args) {
            const dialog = {
                id: args.ID,
                name: args.NAME,
                text: args.TEXT,
                choices: [],
                conditions: new Map(),
                variables: new Map(),
                onEnd: null
            };
            this.dialogs.set(args.ID, dialog);
            return true;
        }

        addChoice(args) {
            const dialog = this.dialogs.get(args.DIALOG_ID);
            if (!dialog) return false;

            dialog.choices.push({
                text: args.TEXT,
                nextDialog: args.NEXT_DIALOG,
                condition: args.CONDITION || null,
                effect: args.EFFECT || null
            });
            return true;
        }

        startDialog(args) {
            const dialog = this.dialogs.get(args.ID);
            if (!dialog) return false;

            this.currentDialog = dialog;
            this._showDialog(dialog);
            return true;
        }

        _showDialog(dialog) {
            this.dialogBox.style.display = 'block';
            this.nameTag.textContent = dialog.name;
            
            // Эффект печатающегося текста
            this.textContent.textContent = '';
            let index = 0;
            const typeText = () => {
                if (index < dialog.text.length) {
                    this.textContent.textContent += dialog.text[index];
                    index++;
                    setTimeout(typeText, 30);
                } else {
                    this._showChoices(dialog);
                }
            };
            typeText();
        }

        _showChoices(dialog) {
            this.choicesContainer.innerHTML = '';
            this.choices = [];

            dialog.choices.forEach((choice, index) => {
                if (!choice.condition || this._evaluateCondition(choice.condition)) {
                    const choiceElement = document.createElement('div');
                    choiceElement.className = 'dialog-choice';
                    choiceElement.textContent = choice.text;
                    choiceElement.onclick = () => this._selectChoice(index);
                    this.choicesContainer.appendChild(choiceElement);
                    this.choices.push(choice);
                }
            });
        }

        _selectChoice(index) {
            const choice = this.choices[index];
            if (!choice) return;

            // Применяем эффект выбора
            if (choice.effect) {
                this._applyEffect(choice.effect);
            }

            // Сохраняем в историю
            this.dialogHistory.push({
                dialog: this.currentDialog.id,
                choice: index
            });

            // Переходим к следующему диалогу
            if (choice.nextDialog) {
                this.startDialog({ ID: choice.nextDialog });
            } else {
                this.endDialog();
            }
        }

        endDialog() {
            this.dialogBox.style.display = 'none';
            this.currentDialog = null;
            return true;
        }

        setVariable(args) {
            this.variables.set(args.NAME, args.VALUE);
            return true;
        }

        getVariable(args) {
            return this.variables.get(args.NAME) || '';
        }

        getLastChoice() {
            if (this.dialogHistory.length === 0) return '';
            const last = this.dialogHistory[this.dialogHistory.length - 1];
            return this.choices[last.choice]?.text || '';
        }

        getInfo() {
            return {
                id: 'dialogsystem',
                name: 'Dialog System',
                color1: '#9C27B0',
                color2: '#7B1FA2',
                blocks: [
                    {
                        opcode: 'createDialog',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать диалог [ID] имя [NAME] текст [TEXT]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dialog1'
                            },
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Персонаж'
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Привет!'
                            }
                        }
                    },
                    {
                        opcode: 'addChoice',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить выбор [TEXT] к диалогу [DIALOG_ID] следующий [NEXT_DIALOG] условие [CONDITION] эффект [EFFECT]',
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Вариант ответа'
                            },
                            DIALOG_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dialog1'
                            },
                            NEXT_DIALOG: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dialog2'
                            },
                            CONDITION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            },
                            EFFECT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            }
                        }
                    },
                    {
                        opcode: 'startDialog',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'начать диалог [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dialog1'
                            }
                        }
                    },
                    {
                        opcode: 'endDialog',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'закончить диалог'
                    },
                    {
                        opcode: 'setVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить переменную диалога [NAME] = [VALUE]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'дружба'
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '10'
                            }
                        }
                    },
                    {
                        opcode: 'getVariable',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'значение переменной диалога [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'дружба'
                            }
                        }
                    },
                    {
                        opcode: 'getLastChoice',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'последний выбор'
                    }
                ]
            };
        }
    }

    Scratch.extensions.register(new DialogSystem());
})(Scratch); 