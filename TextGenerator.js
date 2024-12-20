(function(Scratch) {
    'use strict';

    class TextGenerator {
        constructor() {
            this.markovChains = {};
            this.templates = {
                story: [
                    "В один {время} {персонаж} {действие} в {место}.",
                    "Когда {персонаж} {действие}, вдруг {событие}.",
                    "{персонаж} решил {действие}, потому что {причина}."
                ],
                description: [
                    "{объект} был {прилагательное} и {прилагательное}.",
                    "В {место} было {прилагательное} и {прилагательное}.",
                    "Этот {объект} выглядел {прилагательное}."
                ],
                dialogue: [
                    "- {реплика}! - {эмоция} сказал {персонаж}.",
                    "- {реплика}... - {эмоция} прошептал {персонаж}.",
                    "- {реп��ика}? - {эмоция} спросил {персонаж}."
                ]
            };
            
            this.vocabulary = {
                время: ['утром', 'днём', 'вечером', 'ночью', 'на рассвете', 'в полдень', 'в сумерках'],
                персонаж: ['храбрый рыцарь', 'мудрый волшебник', 'маленькая фея', 'весёлый гном', 'отважный герой'],
                действие: ['отправился в путешествие', 'нашёл сокровище', 'встретил друга', 'открыл тайну', 'победил дракона'],
                место: ['волшебном лесу', 'древнем замке', 'таинственной пещере', 'зачарованной долине', 'магической башне'],
                событие: ['началась гроза', 'появился дракон', 'открылся портал', 'прилетел феникс', 'засиял кристалл'],
                причина: ['это было его судьбой', 'так предсказали звёзды', 'он получил важное послание', 'его позвали друзья'],
                объект: ['замок', 'меч', 'кристалл', 'амулет', 'книга заклинаний', 'волшебная палочка'],
                прилагательное: ['таинственный', 'древний', 'магический', 'сверкающий', 'загадочный', 'волшебный'],
                реплика: ['Я нашёл это!', 'Невероятно!', 'Не может быть!', 'Вот оно что!', 'Я знаю, что делать!'],
                эмоция: ['радостно', 'удивлённо', 'взволнованно', 'задумчиво', 'восторженно']
            };

            // Создаем марковские цепи для каждой категории
            for (let category in this.vocabulary) {
                this.markovChains[category] = this._createMarkovChain(this.vocabulary[category]);
            }
        }

        generateText(args) {
            const type = args.TYPE;
            const theme = args.THEME || '';
            const length = args.LENGTH || 1;

            let result = [];
            for (let i = 0; i < length; i++) {
                const template = this._getRandomTemplate(type);
                const generatedText = this._fillTemplate(template, theme);
                result.push(generatedText);
            }

            return result.join(' ');
        }

        _getRandomTemplate(type) {
            const templates = this.templates[type] || this.templates.story;
            return templates[Math.floor(Math.random() * templates.length)];
        }

        _fillTemplate(template, theme) {
            return template.replace(/\{(\w+)\}/g, (match, category) => {
                let words = this.vocabulary[category];
                if (theme) {
                    words = words.filter(word => word.toLowerCase().includes(theme.toLowerCase()));
                    if (words.length === 0) words = this.vocabulary[category];
                }
                return words[Math.floor(Math.random() * words.length)];
            });
        }

        _createMarkovChain(words, order = 2) {
            const chain = {};
            
            words.forEach(word => {
                for (let i = 0; i < word.length - order; i++) {
                    const key = word.slice(i, i + order);
                    const next = word[i + order];
                    
                    if (!chain[key]) chain[key] = [];
                    chain[key].push(next);
                }
            });
            
            return chain;
        }

        generateWord(args) {
            const category = args.CATEGORY;
            const chain = this.markovChains[category];
            if (!chain) return '';

            const words = this.vocabulary[category];
            const seed = words[Math.floor(Math.random() * words.length)].slice(0, 2);
            let result = seed;
            
            while (result.length < 10) {
                const key = result.slice(-2);
                const nextChars = chain[key];
                if (!nextChars) break;
                
                result += nextChars[Math.floor(Math.random() * nextChars.length)];
            }

            return result;
        }

        addWord(args) {
            const category = args.CATEGORY;
            const word = args.WORD;
            
            if (this.vocabulary[category]) {
                if (!this.vocabulary[category].includes(word)) {
                    this.vocabulary[category].push(word);
                    this.markovChains[category] = this._createMarkovChain(this.vocabulary[category]);
                }
                return true;
            }
            return false;
        }

        getInfo() {
            return {
                id: 'textgen',
                name: 'Text Generator',
                color1: '#4C97FF',
                color2: '#3373CC',
                blocks: [
                    {
                        opcode: 'generateText',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'сгенерировать [TYPE] текст на тему [THEME] длина [LENGTH]',
                        arguments: {
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'textTypes'
                            },
                            THEME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            },
                            LENGTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'generateWord',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'создать новое слово категории [CATEGORY]',
                        arguments: {
                            CATEGORY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'categories'
                            }
                        }
                    },
                    {
                        opcode: 'addWord',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить слово [WORD] в категорию [CATEGORY]',
                        arguments: {
                            WORD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'новое слово'
                            },
                            CATEGORY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'categories'
                            }
                        }
                    }
                ],
                menus: {
                    textTypes: {
                        acceptReporters: false,
                        items: ['story', 'description', 'dialogue']
                    },
                    categories: {
                        acceptReporters: false,
                        items: ['персонаж', 'действие', 'место', 'событие', 'объект', 'прилагательное']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new TextGenerator());
})(Scratch); 