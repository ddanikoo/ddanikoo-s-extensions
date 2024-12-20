(function(Scratch) {
    'use strict';

    class DevTools {
        constructor() {
            this.stats = {
                fps: 0,
                fpsHistory: [],
                spriteCount: 0,
                memoryUsage: 0,
                scriptCount: 0,
                lastUpdate: Date.now(),
                cloneCount: 0,
                variableCount: 0,
                listCount: 0,
                costumesSize: 0,
                soundsSize: 0
            };
            
            this.debugInfo = new Map();
            this.breakpoints = new Set();
            this.profiling = false;
            this.profilingData = new Map();
            this.errorLog = [];
            this.setupDebugPanel();
            this.startMonitoring();
        }

        setupDebugPanel() {
            this.panel = document.createElement('div');
            this.panel.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                display: none;
            `;
            document.body.appendChild(this.panel);
        }

        startMonitoring() {
            setInterval(() => {
                if (this.profiling) {
                    this.updatePerformanceStats();
                }
            }, 1000);
        }

        updatePerformanceStats() {
            const vm = Scratch.vm;
            const now = Date.now();
            const deltaTime = now - this.stats.lastUpdate;
            
            const currentFps = Math.round(1000 / deltaTime);
            this.stats.fpsHistory.push(currentFps);
            if (this.stats.fpsHistory.length > 60) {
                this.stats.fpsHistory.shift();
            }
            this.stats.fps = Math.round(
                this.stats.fpsHistory.reduce((a, b) => a + b, 0) / this.stats.fpsHistory.length
            );

            this.stats.spriteCount = vm.runtime.targets.filter(t => !t.isStage).length;
            this.stats.cloneCount = vm.runtime.targets.filter(t => t.isOriginal === false).length;
            this.stats.scriptCount = this.countAllScripts();
            this.stats.memoryUsage = Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024) || 0;
            this.stats.variableCount = this.countVariables();
            this.stats.listCount = this.countLists();
            this.stats.costumesSize = this.calculateAssetsSize('costumes');
            this.stats.soundsSize = this.calculateAssetsSize('sounds');
            
            this.stats.lastUpdate = now;
            
            if (this.panel.style.display === 'block') {
                this.updateDebugPanel();
            }
        }

        countAllScripts() {
            const vm = Scratch.vm;
            let count = 0;
            for (const target of vm.runtime.targets) {
                if (target.isStage) continue;
                count += Object.keys(target.blocks._blocks).length;
            }
            return count;
        }

        countVariables() {
            const vm = Scratch.vm;
            let count = 0;
            for (const target of vm.runtime.targets) {
                count += Object.keys(target.variables).length;
            }
            return count;
        }

        countLists() {
            const vm = Scratch.vm;
            let count = 0;
            for (const target of vm.runtime.targets) {
                count += Object.keys(target.lists).length;
            }
            return count;
        }

        calculateAssetsSize(type) {
            const vm = Scratch.vm;
            let size = 0;
            for (const target of vm.runtime.targets) {
                for (const asset of target[type]) {
                    size += asset.asset?.data?.buffer?.byteLength || 0;
                }
            }
            return Math.round(size / 1024 / 1024 * 100) / 100;
        }

        updateDebugPanel() {
            this.panel.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">Производительность:</div>
                FPS: ${this.stats.fps} ${this._getFpsIndicator()}<br>
                CPU: ${this._getCPUUsage()}%<br>
                Память: ${this.stats.memoryUsage}MB<br>
                <div style="font-weight: bold; margin: 5px 0;">Статистика проекта:</div>
                Спрайтов: ${this.stats.spriteCount}<br>
                Клонов: ${this.stats.cloneCount}<br>
                Скриптов: ${this.stats.scriptCount}<br>
                Переменных: ${this.stats.variableCount}<br>
                Списков: ${this.stats.listCount}<br>
                Размер костюмов: ${this.stats.costumesSize}MB<br>
                Размер звуков: ${this.stats.soundsSize}MB<br>
                ${this.errorLog.length > 0 ? `
                    <div style="font-weight: bold; color: #ff4444; margin: 5px 0;">Ошибки (${this.errorLog.length}):</div>
                    ${this.errorLog.slice(-3).map(error => 
                        `<div style="color: #ff4444; font-size: 10px;">${error}</div>`
                    ).join('')}
                ` : ''}
                ${this.debugInfo.size > 0 ? `
                    <div style="font-weight: bold; margin: 5px 0;">Отладка:</div>
                    ${Array.from(this.debugInfo.entries()).map(([key, value]) => 
                        `${key}: ${value}`
                    ).join('<br>')}
                ` : ''}
            `;
        }

        _getFpsIndicator() {
            if (this.stats.fps >= 55) return '🟢';
            if (this.stats.fps >= 30) return '🟡';
            return '🔴';
        }

        _getCPUUsage() {
            const timeDiff = Date.now() - this.stats.lastUpdate;
            const usage = Math.min(100, Math.round((timeDiff / 16.66) * 100));
            return usage;
        }

        startProfiling(args) {
            this.profiling = true;
            this.panel.style.display = 'block';
            return 'Профилирование запущено';
        }

        stopProfiling() {
            this.profiling = false;
            this.panel.style.display = 'none';
            return 'Профилирование остановлено';
        }

        addBreakpoint(args) {
            const id = args.SPRITE + '_' + args.SCRIPT;
            this.breakpoints.add(id);
            return true;
        }

        removeBreakpoint(args) {
            const id = args.SPRITE + '_' + args.SCRIPT;
            this.breakpoints.delete(id);
            return true;
        }

        logValue(args) {
            this.debugInfo.set(args.KEY, args.VALUE);
            if (this.profiling) {
                this.updateDebugPanel();
            }
            return args.VALUE;
        }

        logError(args) {
            const error = {
                message: args.MESSAGE,
                sprite: args.SPRITE,
                time: new Date().toLocaleTimeString()
            };
            this.errorLog.push(`${error.time} [${error.sprite}] ${error.message}`);
            if (this.errorLog.length > 50) this.errorLog.shift();
            return args.MESSAGE;
        }

        clearErrorLog() {
            this.errorLog = [];
            return true;
        }

        getPerformanceValue(args) {
            switch(args.TYPE) {
                case 'fps':
                    return this.stats.fps;
                case 'sprites':
                    return this.stats.spriteCount;
                case 'scripts':
                    return this.stats.scriptCount;
                case 'memory':
                    return this.stats.memoryUsage;
                default:
                    return 0;
            }
        }

        getAssetCount(args) {
            const vm = Scratch.vm;
            const type = args.TYPE.toLowerCase();
            let count = 0;
            for (const target of vm.runtime.targets) {
                count += target[type].length;
            }
            return count;
        }

        optimizationTips() {
            const tips = [];
            
            if (this.stats.spriteCount > 100) {
                tips.push('Большое количество спрайтов может замедлять проект');
            }
            if (this.stats.scriptCount > 500) {
                tips.push('Слишком много скриптов. Попробуйте объединить похожие скрипты');
            }
            if (this.stats.fps < 30) {
                tips.push('Низкий FPS. Проверьте сложные вычисления и количество клонов');
            }
            
            return tips.join('\n') || 'Производительность в норме';
        }

        getInfo() {
            return {
                id: 'devtools',
                name: 'Dev Tools',
                color1: '#404040',
                color2: '#303030',
                blocks: [
                    {
                        opcode: 'startProfiling',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'начать профилирование'
                    },
                    {
                        opcode: 'stopProfiling',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'остановить профилирование'
                    },
                    {
                        opcode: 'logValue',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'отладка [KEY] = [VALUE]',
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'переменная'
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '0'
                            }
                        }
                    },
                    {
                        opcode: 'logError',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'записать ошибку [MESSAGE] в спрайте [SPRITE]',
                        arguments: {
                            MESSAGE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'ошибка'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Спрайт1'
                            }
                        }
                    },
                    {
                        opcode: 'clearErrorLog',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'очистить лог ошибок'
                    },
                    {
                        opcode: 'getPerformanceValue',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'получить [TYPE]',
                        arguments: {
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'performanceTypes'
                            }
                        }
                    },
                    {
                        opcode: 'getAssetCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'количество [TYPE]',
                        arguments: {
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'assetTypes'
                            }
                        }
                    },
                    {
                        opcode: 'optimizationTips',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'советы по оптимизации'
                    },
                    {
                        opcode: 'getCloneCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'количество клонов'
                    },
                    {
                        opcode: 'getMemoryUsage',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'использование памяти (МБ)'
                    },
                    {
                        opcode: 'getCPUUsage',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'загрузка CPU (%)'
                    }
                ],
                menus: {
                    performanceTypes: {
                        acceptReporters: false,
                        items: ['fps', 'sprites', 'scripts', 'memory', 'variables', 'lists']
                    },
                    assetTypes: {
                        acceptReporters: false,
                        items: ['costumes', 'sounds']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new DevTools());
})(Scratch); 