(function(Scratch) {
    'use strict';

    class DungeonGenerator {
        constructor() {
            this.dungeons = new Map();
            this.currentDungeon = null;
            this.tileSize = 30;
            this.setupCanvas();
        }

        setupCanvas() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            
            const scratchCanvas = Scratch.vm.runtime.renderer.canvas;
            this.canvas.width = scratchCanvas.width;
            this.canvas.height = scratchCanvas.height;
            
            scratchCanvas.parentElement.insertBefore(this.canvas, scratchCanvas.nextSibling);
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = scratchCanvas.style.top;
            this.canvas.style.left = scratchCanvas.style.left;
            this.canvas.style.pointerEvents = 'none';
        }

        generateDungeon(args) {
            const width = args.WIDTH || 20;
            const height = args.HEIGHT || 20;
            const roomCount = args.ROOMS || 5;
            const style = args.STYLE || 'classic';

            const dungeon = {
                id: args.ID,
                width: width,
                height: height,
                grid: Array(height).fill().map(() => Array(width).fill(1)), // 1 = стена
                rooms: [],
                corridors: [],
                items: [],
                enemies: [],
                style: style
            };

            // Генерируем комнаты
            for (let i = 0; i < roomCount; i++) {
                this._generateRoom(dungeon);
            }

            // Соединяем комнаты коридорами
            this._connectRooms(dungeon);

            // Добавляем детали в зависимости от стиля
            this._addDetails(dungeon);

            this.dungeons.set(args.ID, dungeon);
            this._renderDungeon(dungeon);
            return true;
        }

        _generateRoom(dungeon) {
            const minSize = 3;
            const maxSize = 8;
            const width = minSize + Math.floor(Math.random() * (maxSize - minSize));
            const height = minSize + Math.floor(Math.random() * (maxSize - minSize));
            
            // Находим случайную позицию для комнаты
            let attempts = 50;
            while (attempts > 0) {
                const x = 1 + Math.floor(Math.random() * (dungeon.width - width - 2));
                const y = 1 + Math.floor(Math.random() * (dungeon.height - height - 2));
                
                if (this._canPlaceRoom(dungeon, x, y, width, height)) {
                    // Размещаем комнату
                    for (let dy = 0; dy < height; dy++) {
                        for (let dx = 0; dx < width; dx++) {
                            dungeon.grid[y + dy][x + dx] = 0; // 0 = пол
                        }
                    }
                    
                    dungeon.rooms.push({x, y, width, height});
                    break;
                }
                attempts--;
            }
        }

        _canPlaceRoom(dungeon, x, y, width, height) {
            // Проверяем с отступом в 1 клетку
            for (let dy = -1; dy <= height; dy++) {
                for (let dx = -1; dx <= width; dx++) {
                    const checkX = x + dx;
                    const checkY = y + dy;
                    if (checkX < 0 || checkX >= dungeon.width || 
                        checkY < 0 || checkY >= dungeon.height ||
                        dungeon.grid[checkY][checkX] === 0) {
                        return false;
                    }
                }
            }
            return true;
        }

        _connectRooms(dungeon) {
            const {rooms} = dungeon;
            // Используем алгоритм минимального остовного дерева
            for (let i = 0; i < rooms.length - 1; i++) {
                const roomA = rooms[i];
                const roomB = rooms[i + 1];
                this._createCorridor(dungeon, 
                    roomA.x + Math.floor(roomA.width/2), 
                    roomA.y + Math.floor(roomA.height/2),
                    roomB.x + Math.floor(roomB.width/2), 
                    roomB.y + Math.floor(roomB.height/2)
                );
            }
        }

        _createCorridor(dungeon, x1, y1, x2, y2) {
            // Используем L-образные коридоры
            const corridor = [];
            let currentX = x1;
            let currentY = y1;

            // Сначала идем по X
            while (currentX !== x2) {
                dungeon.grid[currentY][currentX] = 0;
                corridor.push({x: currentX, y: currentY});
                currentX += (x2 > x1) ? 1 : -1;
            }

            // Затем по Y
            while (currentY !== y2) {
                dungeon.grid[currentY][currentX] = 0;
                corridor.push({x: currentX, y: currentY});
                currentY += (y2 > y1) ? 1 : -1;
            }

            dungeon.corridors.push(corridor);
        }

        _addDetails(dungeon) {
            switch(dungeon.style) {
                case 'classic':
                    this._addClassicDetails(dungeon);
                    break;
                case 'cave':
                    this._addCaveDetails(dungeon);
                    break;
                case 'ruins':
                    this._addRuinsDetails(dungeon);
                    break;
            }
        }

        _addClassicDetails(dungeon) {
            // Добавляем факелы вдоль коридоров
            for (const corridor of dungeon.corridors) {
                for (let i = 2; i < corridor.length - 2; i += 3) {
                    const {x, y} = corridor[i];
                    if (this._countWallNeighbors(dungeon, x, y) >= 2) {
                        dungeon.items.push({
                            type: 'torch',
                            x: x,
                            y: y
                        });
                    }
                }
            }

            // Добавляем сундуки в комнаты
            for (const room of dungeon.rooms) {
                if (Math.random() < 0.7) {
                    const x = room.x + 1 + Math.floor(Math.random() * (room.width - 2));
                    const y = room.y + 1 + Math.floor(Math.random() * (room.height - 2));
                    dungeon.items.push({
                        type: 'chest',
                        x: x,
                        y: y
                    });
                }
            }
        }

        _countWallNeighbors(dungeon, x, y) {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const checkX = x + dx;
                    const checkY = y + dy;
                    if (checkX >= 0 && checkX < dungeon.width &&
                        checkY >= 0 && checkY < dungeon.height &&
                        dungeon.grid[checkY][checkX] === 1) {
                        count++;
                    }
                }
            }
            return count;
        }

        _renderDungeon(dungeon) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            const offsetX = (this.canvas.width - dungeon.width * this.tileSize) / 2;
            const offsetY = (this.canvas.height - dungeon.height * this.tileSize) / 2;

            // Рендерим стены и пол
            for (let y = 0; y < dungeon.height; y++) {
                for (let x = 0; x < dungeon.width; x++) {
                    const tile = dungeon.grid[y][x];
                    this.ctx.fillStyle = tile === 1 ? '#666' : '#eee';
                    this.ctx.fillRect(
                        offsetX + x * this.tileSize,
                        offsetY + y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }

            // Рендерим предметы
            for (const item of dungeon.items) {
                this.ctx.fillStyle = item.type === 'torch' ? '#ffa500' : '#8b4513';
                this.ctx.fillRect(
                    offsetX + item.x * this.tileSize + this.tileSize/4,
                    offsetY + item.y * this.tileSize + this.tileSize/4,
                    this.tileSize/2,
                    this.tileSize/2
                );
            }
        }

        getTileAt(args) {
            const dungeon = this.dungeons.get(args.ID);
            if (!dungeon) return -1;
            
            const x = Math.floor(args.X);
            const y = Math.floor(args.Y);
            
            if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) {
                return -1;
            }
            
            return dungeon.grid[y][x];
        }

        getItemAt(args) {
            const dungeon = this.dungeons.get(args.ID);
            if (!dungeon) return '';
            
            const x = Math.floor(args.X);
            const y = Math.floor(args.Y);
            
            const item = dungeon.items.find(i => i.x === x && i.y === y);
            return item ? item.type : '';
        }

        getRoomCount(args) {
            const dungeon = this.dungeons.get(args.ID);
            return dungeon ? dungeon.rooms.length : 0;
        }

        getInfo() {
            return {
                id: 'dungeongenerator',
                name: 'Dungeon Generator',
                color1: '#8B4513',
                color2: '#654321',
                blocks: [
                    {
                        opcode: 'generateDungeon',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать подземелье [ID] размер [WIDTH]x[HEIGHT] комнат [ROOMS] стиль [STYLE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dungeon1'
                            },
                            WIDTH: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            },
                            HEIGHT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 20
                            },
                            ROOMS: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 5
                            },
                            STYLE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'dungeonStyles'
                            }
                        }
                    },
                    {
                        opcode: 'getTileAt',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'получить тип клетки x: [X] y: [Y] в подземелье [ID]',
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dungeon1'
                            }
                        }
                    },
                    {
                        opcode: 'getItemAt',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'получить предмет x: [X] y: [Y] в подземелье [ID]',
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dungeon1'
                            }
                        }
                    },
                    {
                        opcode: 'getRoomCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'количество комнат в подземелье [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'dungeon1'
                            }
                        }
                    }
                ],
                menus: {
                    dungeonStyles: {
                        acceptReporters: false,
                        items: ['classic', 'cave', 'ruins']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new DungeonGenerator());
})(Scratch); 