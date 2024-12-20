(function(Scratch) {
    'use strict';

    class TestSuite {
        constructor() {
            this.tests = new Map();
            this.results = new Map();
            this.currentSuite = null;
            this.assertions = 0;
            this.passed = 0;
            this.failed = 0;
            this.setupTestPanel();
        }

        setupTestPanel() {
            this.panel = document.createElement('div');
            this.panel.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(40, 40, 40, 0.9);
                color: #fff;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                max-height: 80vh;
                overflow-y: auto;
                display: none;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                width: 300px;
            `;
            document.body.appendChild(this.panel);
        }

        createTestSuite(args) {
            const suite = {
                name: args.NAME,
                tests: [],
                setup: null,
                teardown: null,
                startTime: null,
                endTime: null
            };
            this.tests.set(args.NAME, suite);
            this.currentSuite = suite;
            return args.NAME;
        }

        addTest(args) {
            if (!this.currentSuite) return false;
            
            const test = {
                name: args.NAME,
                expectedValue: args.EXPECTED,
                actualValue: args.ACTUAL,
                type: args.TYPE || 'equals',
                passed: null,
                error: null
            };
            
            this.currentSuite.tests.push(test);
            return true;
        }

        runTests(args) {
            const suiteName = args.SUITE;
            const suite = this.tests.get(suiteName);
            if (!suite) return 'Набор тестов не найден';

            suite.startTime = performance.now();
            this.assertions = 0;
            this.passed = 0;
            this.failed = 0;

            // Запускаем тесты
            for (const test of suite.tests) {
                try {
                    this.assertions++;
                    switch(test.type) {
                        case 'equals':
                            test.passed = this._assertEquals(test.expectedValue, test.actualValue);
                            break;
                        case 'contains':
                            test.passed = this._assertContains(test.expectedValue, test.actualValue);
                            break;
                        case 'type':
                            test.passed = this._assertType(test.expectedValue, test.actualValue);
                            break;
                        case 'range':
                            test.passed = this._assertRange(test.expectedValue, test.actualValue);
                            break;
                    }
                    if (test.passed) this.passed++;
                    else this.failed++;
                } catch (error) {
                    test.error = error.message;
                    test.passed = false;
                    this.failed++;
                }
            }

            suite.endTime = performance.now();
            this._updateTestPanel(suite);
            return this._getTestSummary(suite);
        }

        _assertEquals(expected, actual) {
            return expected === actual;
        }

        _assertContains(container, value) {
            return container.includes(value);
        }

        _assertType(expectedType, value) {
            return typeof value === expectedType;
        }

        _assertRange(range, value) {
            const [min, max] = range.split(',').map(Number);
            return value >= min && value <= max;
        }

        _updateTestPanel(suite) {
            this.panel.style.display = 'block';
            const duration = (suite.endTime - suite.startTime).toFixed(2);
            
            this.panel.innerHTML = `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #555; padding-bottom: 5px;">
                    <div style="font-size: 14px; font-weight: bold; color: #4CAF50;">
                        ${suite.name}
                    </div>
                    <div style="color: #888; margin-top: 5px;">
                        Время выполнения: ${duration}ms
                    </div>
                </div>
                <div style="margin-bottom: 10px;">
                    <span style="color: #4CAF50;">✓ ${this.passed}</span> |
                    <span style="color: #f44336;">✗ ${this.failed}</span> |
                    Всего: ${this.assertions}
                </div>
                <div style="margin-top: 10px;">
                    ${suite.tests.map(test => `
                        <div style="margin-bottom: 8px; padding: 5px; background: ${test.passed ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'}; border-radius: 4px;">
                            <div style="color: ${test.passed ? '#4CAF50' : '#f44336'};">
                                ${test.passed ? '✓' : '✗'} ${test.name}
                            </div>
                            ${!test.passed ? `
                                <div style="font-size: 11px; color: #888; margin-top: 3px;">
                                    Ожидалось: ${test.expectedValue}<br>
                                    Получено: ${test.actualValue}
                                    ${test.error ? `<br>Ошибка: ${test.error}` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        _getTestSummary(suite) {
            return `Пройдено: ${this.passed}/${this.assertions} (${Math.round(this.passed/this.assertions*100)}%)`;
        }

        getTestResult(args) {
            const suite = this.tests.get(args.SUITE);
            if (!suite) return false;
            
            const test = suite.tests.find(t => t.name === args.TEST);
            return test ? test.passed : false;
        }

        getInfo() {
            return {
                id: 'testsuite',
                name: 'Test Suite',
                color1: '#2196F3',
                color2: '#1976D2',
                blocks: [
                    {
                        opcode: 'createTestSuite',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать набор тестов [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Мои тесты'
                            }
                        }
                    },
                    {
                        opcode: 'addTest',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить тест [NAME] ожидается [EXPECTED] получено [ACTUAL] тип [TYPE]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'тест 1'
                            },
                            EXPECTED: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '10'
                            },
                            ACTUAL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '10'
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'testTypes'
                            }
                        }
                    },
                    {
                        opcode: 'runTests',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'запустить тесты [SUITE]',
                        arguments: {
                            SUITE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Мои тесты'
                            }
                        }
                    },
                    {
                        opcode: 'getTestResult',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'тест [TEST] из [SUITE] пройден?',
                        arguments: {
                            TEST: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'тест 1'
                            },
                            SUITE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Мои тесты'
                            }
                        }
                    }
                ],
                menus: {
                    testTypes: {
                        acceptReporters: false,
                        items: [
                            { text: 'равно', value: 'equals' },
                            { text: 'содержит', value: 'contains' },
                            { text: 'тип', value: 'type' },
                            { text: 'диапазон', value: 'range' }
                        ]
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new TestSuite());
})(Scratch); 