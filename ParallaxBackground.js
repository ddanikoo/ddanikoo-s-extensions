(function(Scratch) {
    'use strict';

    class ParallaxBackground {
        constructor() {
            this.runtime = Scratch.vm.runtime;
            this.layers = new Map();
            this.target = null;
            this.lastTargetX = 0;
            this.setupUpdate();
        }

        setupUpdate() {
            // Обновляем каждый кадр
            this.runtime.on('PROJECT_RENDERED', () => {
                this.updateLayers();
            });
        }

        createLayer(args) {
            const sprite = this.runtime.getSpriteTargetByName(args.SPRITE);
            if (!sprite) return false;

            // Увеличиваем спрайт для заполнения экрана по высоте
            const stage = this.runtime.getTargetForStage();
            const scale = (stage.height / sprite.size[1]) * 1.2;
            sprite.setSize(scale * 100);

            const layer = {
                sprite: sprite,
                speed: args.SPEED,
                width: sprite.size[0],
                clones: [],
                active: true
            };

            // Создаем клоны для заполнения экрана
            const stageWidth = stage.width;
            const spritesNeeded = Math.ceil((stageWidth * 2) / layer.width) + 1;

            // Позиционируем основной спрайт
            sprite.setXY(-stageWidth, 0);
            
            // Создаем клоны и располагаем их последовательно
            let currentX = -stageWidth + layer.width;
            for (let i = 0; i < spritesNeeded; i++) {
                const clone = sprite.makeClone();
                if (clone) {
                    clone.setXY(currentX, 0);
                    layer.clones.push(clone);
                    currentX += layer.width;
                }
            }

            this.layers.set(args.ID, layer);
            return true;
        }

        setTarget(args) {
            const target = this.runtime.getSpriteTargetByName(args.SPRITE);
            if (!target) return false;

            this.target = target;
            this.lastTargetX = target.x;
            return true;
        }

        updateLayers() {
            if (!this.target) return;

            const deltaX = this.target.x - this.lastTargetX;
            this.lastTargetX = this.target.x;

            const stage = this.runtime.getTargetForStage();
            const stageWidth = stage.width;

            for (const layer of this.layers.values()) {
                if (!layer.active) continue;

                // Двигаем все элементы слоя
                const moveAmount = deltaX * layer.speed;
                
                // Двигаем основной спрайт и все клоны
                const allSprites = [layer.sprite, ...layer.clones];
                for (const sprite of allSprites) {
                    sprite.setXY(sprite.x - moveAmount, sprite.y);
                }

                // Проверяем и перемещаем спрайты
                this.repositionSprites(layer, stageWidth);
            }
        }

        repositionSprites(layer, stageWidth) {
            const margin = layer.width;

            // Проверяем и перемещаем каждый спрайт
            const allSprites = [layer.sprite, ...layer.clones];
            
            for (const sprite of allSprites) {
                // Если спрайт ушел слишком влево
                if (sprite.x < -stageWidth - margin) {
                    // Находим самый правый спрайт
                    let rightmostX = -Infinity;
                    for (const s of allSprites) {
                        if (s.x > rightmostX) {
                            rightmostX = s.x;
                        }
                    }
                    // Перемещаем текущий спрайт вправо
                    sprite.setXY(rightmostX + layer.width, sprite.y);
                }
                // Если спрайт ушел слишком вправо
                else if (sprite.x > stageWidth + margin) {
                    // Находим самый левый спрайт
                    let leftmostX = Infinity;
                    for (const s of allSprites) {
                        if (s.x < leftmostX) {
                            leftmostX = s.x;
                        }
                    }
                    // Перемещаем текущий спрайт влево
                    sprite.setXY(leftmostX - layer.width, sprite.y);
                }
            }
        }

        removeLayer(args) {
            const layer = this.layers.get(args.ID);
            if (!layer) return false;

            // Удаляем все клоны
            for (const clone of layer.clones) {
                clone.deleteClone();
            }
            layer.clones = [];
            layer.active = false;
            this.layers.delete(args.ID);
            return true;
        }

        setLayerSpeed(args) {
            const layer = this.layers.get(args.ID);
            if (!layer) return false;

            layer.speed = args.SPEED;
            return true;
        }

        getInfo() {
            return {
                id: 'parallaxbackground',
                name: 'Parallax BG',
                color1: '#5C9C5C',
                color2: '#499149',
                blocks: [
                    {
                        opcode: 'createLayer',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'создать фоновый слой [ID] из спрайта [SPRITE] скорость [SPEED]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'layer1'
                            },
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'sprites'
                            },
                            SPEED: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0.5
                            }
                        }
                    },
                    {
                        opcode: 'setTarget',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'привязать параллакс к спрайту [SPRITE]',
                        arguments: {
                            SPRITE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'sprites'
                            }
                        }
                    },
                    {
                        opcode: 'removeLayer',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить фоновый слой [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'layer1'
                            }
                        }
                    },
                    {
                        opcode: 'setLayerSpeed',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'установить скорость [SPEED] для слоя [ID]',
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'layer1'
                            },
                            SPEED: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0.5
                            }
                        }
                    }
                ],
                menus: {
                    sprites: {
                        acceptReporters: false,
                        items: 'getSpriteMenu'
                    }
                }
            };
        }

        getSpriteMenu() {
            const sprites = [];
            for (const target of this.runtime.targets) {
                if (!target.isStage) {
                    sprites.push(target.sprite.name);
                }
            }
            return sprites;
        }
    }

    Scratch.extensions.register(new ParallaxBackground());
})(Scratch); 