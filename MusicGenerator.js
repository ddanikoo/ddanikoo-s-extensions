(function(Scratch) {
    'use strict';

    class MusicGenerator {
        constructor() {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.melodies = new Map();
            this.instruments = {
                sine: this.audioContext.createOscillator.bind(this.audioContext),
                square: this.audioContext.createOscillator.bind(this.audioContext),
                sawtooth: this.audioContext.createOscillator.bind(this.audioContext)
            };
            this.scales = {
                major: [0, 2, 4, 5, 7, 9, 11],
                minor: [0, 2, 3, 5, 7, 8, 10],
                pentatonic: [0, 2, 4, 7, 9]
            };
            this.baseNote = 440; // A4
            this.currentMelody = null;
        }

        generateMelody(args) {
            const length = args.LENGTH || 8;
            const scale = this.scales[args.SCALE] || this.scales.major;
            const rootNote = args.ROOT || 0;
            const tempo = args.TEMPO || 120;

            // Создаем мелодию на основе марковской цепи
            const melody = {
                notes: [],
                durations: [],
                instrument: args.INSTRUMENT || 'sine',
                tempo: tempo,
                id: args.ID
            };

            let previousNote = rootNote;
            for (let i = 0; i < length; i++) {
                // Используем марковскую цепь для выбора следующей ноты
                const nextNote = this._getNextNote(previousNote, scale);
                melody.notes.push(nextNote);
                
                // Генерируем длительность ноты
                const duration = this._getNoteDuration(tempo);
                melody.durations.push(duration);
                
                previousNote = nextNote;
            }

            this.melodies.set(args.ID, melody);
            return true;
        }

        _getNextNote(previousNote, scale) {
            // Вероятности перехода для разных интервалов
            const transitions = [
                {interval: 0, probability: 0.1},  // Та же нота
                {interval: 1, probability: 0.3},  // Секунда вверх
                {interval: -1, probability: 0.2}, // Секунда вниз
                {interval: 2, probability: 0.2},  // Терция вверх
                {interval: -2, probability: 0.1}, // Терция вниз
                {interval: 4, probability: 0.1}   // Квинта вверх
            ];

            // Выбираем интервал на основе вероятностей
            const random = Math.random();
            let sum = 0;
            let selectedInterval = 0;

            for (const transition of transitions) {
                sum += transition.probability;
                if (random < sum) {
                    selectedInterval = transition.interval;
                    break;
                }
            }

            // Находим новую ноту в пределах scale
            const scaleIndex = scale.indexOf(previousNote % 12);
            let newIndex = scaleIndex + selectedInterval;
            
            // Обеспечиваем, чтобы нота оставалась в пределах октавы
            while (newIndex >= scale.length) newIndex -= scale.length;
            while (newIndex < 0) newIndex += scale.length;

            return scale[newIndex];
        }

        _getNoteDuration(tempo) {
            // Возможные длительности нот (в долях)
            const durations = [
                {value: 1, probability: 0.4},    // Четверт��
                {value: 0.5, probability: 0.3},  // Восьмая
                {value: 2, probability: 0.2},    // Половинная
                {value: 0.25, probability: 0.1}  // Шестнадцатая
            ];

            const random = Math.random();
            let sum = 0;

            for (const duration of durations) {
                sum += duration.probability;
                if (random < sum) {
                    return (60 / tempo) * duration.value;
                }
            }

            return 60 / tempo; // Четверть по умолчанию
        }

        playMelody(args) {
            const melody = this.melodies.get(args.ID);
            if (!melody) return false;

            this.stopMelody({ID: args.ID});
            
            let time = this.audioContext.currentTime;
            const oscillators = [];

            for (let i = 0; i < melody.notes.length; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = melody.instrument;
                oscillator.frequency.value = this._noteToFrequency(melody.notes[i]);
                
                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(0.5, time + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, time + melody.durations[i] - 0.01);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start(time);
                oscillator.stop(time + melody.durations[i]);
                
                time += melody.durations[i];
                oscillators.push({oscillator, gainNode});
            }

            melody.playing = oscillators;
            return true;
        }

        stopMelody(args) {
            const melody = this.melodies.get(args.ID);
            if (!melody || !melody.playing) return false;

            melody.playing.forEach(({oscillator, gainNode}) => {
                oscillator.stop();
                gainNode.disconnect();
            });

            melody.playing = null;
            return true;
        }

        _noteToFrequency(note) {
            return this.baseNote * Math.pow(2, note / 12);
        }

        getInfo() {
            return {
                id: 'musicgen',
                name: 'AI Music Generator',
                color1: '#E6A8D7',
                color2: '#D279B6',
                blocks: [
                    {
                        opcode: 'generateMelody',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'сгенерировать мелодию [ID] длина [LENGTH] лад [SCALE] темп [TEMPO] инструмент [INSTRUMENT]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'melody1'
                            },
                            LENGTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 8
                            },
                            SCALE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'scales'
                            },
                            TEMPO: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 120
                            },
                            INSTRUMENT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'instruments'
                            }
                        }
                    },
                    {
                        opcode: 'playMelody',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'играть мелодию [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'melody1'
                            }
                        }
                    },
                    {
                        opcode: 'stopMelody',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'остановить мелодию [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'melody1'
                            }
                        }
                    }
                ],
                menus: {
                    scales: {
                        acceptReporters: false,
                        items: ['major', 'minor', 'pentatonic']
                    },
                    instruments: {
                        acceptReporters: false,
                        items: ['sine', 'square', 'sawtooth']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new MusicGenerator());
})(Scratch); 