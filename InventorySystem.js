(function(Scratch) {
    'use strict';

    class InventorySystem {
        constructor() {
            this.inventories = new Map();
            this.currentInventory = null;
            this.runtime = Scratch.vm.runtime;
            this.renderer = this.runtime.renderer;
            this.setupInventoryUI();
        }

        setupInventoryUI() {
            this.container = document.createElement('div');
            this.container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(30, 30, 30, 0.95);
                border: 2px solid #444;
                border-radius: 10px;
                padding: 20px;
                display: none;
                z-index: 9999;
                color: white;
                font-family: Arial, sans-serif;
            `;

            this.grid = document.createElement('div');
            this.grid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(5, 60px);
                gap: 10px;
                margin-bottom: 20px;
            `;

            this.container.appendChild(this.grid);
            document.body.appendChild(this.container);

            const style = document.createElement('style');
            style.textContent = `
                .inventory-slot {
                    width: 60px;
                    height: 60px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .inventory-item {
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .inventory-count {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    background: rgba(0,0,0,0.7);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        createInventory(args) {
            const inventory = {
                id: args.ID,
                size: args.SIZE || 25,
                items: new Map(),
                maxStack: 99
            };
            this.inventories.set(args.ID, inventory);
            return true;
        }

        showInventory(args) {
            const inventory = this.inventories.get(args.ID);
            if (!inventory) return false;
            
            this.currentInventory = inventory;
            this.container.style.display = 'block';
            this._updateGrid();
            return true;
        }

        hideInventory() {
            this.container.style.display = 'none';
            this.currentInventory = null;
            return true;
        }

        addItem(args) {
            const inventory = this.inventories.get(args.INVENTORY_ID);
            if (!inventory) return false;

            const item = {
                id: args.ITEM_ID,
                sprite: args.SPRITE,
                count: args.COUNT || 1
            };

            // Пытаемся добавить к существующей стопке
            for (const [slot, existingItem] of inventory.items) {
                if (existingItem.id === item.id && existingItem.count < inventory.maxStack) {
                    existingItem.count += item.count;
                    this._updateGrid();
                    return true;
                }
            }

            // Ищем свободный слот
            for (let i = 0; i < inventory.size; i++) {
                if (!inventory.items.has(i)) {
                    inventory.items.set(i, item);
                    this._updateGrid();
                    return true;
                }
            }

            return false;
        }

        removeItem(args) {
            const inventory = this.inventories.get(args.INVENTORY_ID);
            if (!inventory) return false;

            for (const [slot, item] of inventory.items) {
                if (item.id === args.ITEM_ID) {
                    const removeCount = args.COUNT || item.count;
                    item.count -= removeCount;
                    if (item.count <= 0) {
                        inventory.items.delete(slot);
                    }
                    this._updateGrid();
                    return true;
                }
            }
            return false;
        }

        getItemCount(args) {
            const inventory = this.inventories.get(args.INVENTORY_ID);
            if (!inventory) return 0;

            let count = 0;
            for (const item of inventory.items.values()) {
                if (item.id === args.ITEM_ID) {
                    count += item.count;
                }
            }
            return count;
        }

        hasSpace(args) {
            const inventory = this.inventories.get(args.INVENTORY_ID);
            if (!inventory) return false;
            return inventory.items.size < inventory.size;
        }

        _updateGrid() {
            if (!this.currentInventory) return;
            
            this.grid.innerHTML = '';
            for (let i = 0; i < this.currentInventory.size; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                
                const item = this.currentInventory.items.get(i);
                if (item) {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'inventory-item';

                    // Получаем спрайт
                    const target = this.runtime.targets.find(t => t.sprite.name === item.sprite);
                    if (target) {
                        const costume = target.sprite.costumes[target.currentCostume];
                        const img = document.createElement('img');
                        img.src = costume.asset.encodeDataURI();
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        itemDiv.appendChild(img);
                    }
                    
                    if (item.count > 1) {
                        const count = document.createElement('div');
                        count.className = 'inventory-count';
                        count.textContent = item.count;
                        itemDiv.appendChild(count);
                    }
                    
                    slot.appendChild(itemDiv);
                }
                
                this.grid.appendChild(slot);
            }
        }

        _getSpriteMenu() {
            const menu = [];
            for (const target of this.runtime.targets) {
                if (!target.isStage && target.sprite) {
                    menu.push({
                        text: target.sprite.name,
                        value: target.sprite.name
                    });
                }
            }
            return menu;
        }

        getInfo() {
            return {
                id: 'inventorysystem',
                name: 'Inventory',
                color1: '#7E57C2',
                color2: '#5E35B1',
                blocks: [
                    {
                        opcode: 'createInventory',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать инвентарь [ID] размер [SIZE]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            },
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 25
                            }
                        }
                    },
                    {
                        opcode: 'showInventory',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'показать инвентарь [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            }
                        }
                    },
                    {
                        opcode: 'hideInventory',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'скрыть инвентарь'
                    },
                    {
                        opcode: 'addItem',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить предмет [ITEM_ID] спрайт [SPRITE] в [INVENTORY_ID] количество [COUNT]',
                        arguments: {
                            ITEM_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'item1'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'spriteMenu'
                            },
                            INVENTORY_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            },
                            COUNT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'removeItem',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить [ITEM_ID] из [INVENTORY_ID] количество [COUNT]',
                        arguments: {
                            ITEM_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'item1'
                            },
                            INVENTORY_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            },
                            COUNT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },
                    {
                        opcode: 'getItemCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'количество [ITEM_ID] в [INVENTORY_ID]',
                        arguments: {
                            ITEM_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'item1'
                            },
                            INVENTORY_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            }
                        }
                    },
                    {
                        opcode: 'hasSpace',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'есть место в [INVENTORY_ID]',
                        arguments: {
                            INVENTORY_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'inv1'
                            }
                        }
                    }
                ],
                menus: {
                    spriteMenu: {
                        acceptReporters: true,
                        items: '_getSpriteMenu'
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new InventorySystem());
})(Scratch); 