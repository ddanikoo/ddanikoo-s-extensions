(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Расширение Ray Casting должно быть запущено вне песочницы');
    }

    class RayCasting {
        constructor() {
            console.log('Initializing RayCasting extension...');
            this.lights = new Map();
            this._setupRenderer();
            this._setupResizeHandler();
            console.log('RayCasting extension initialized');
        }

        _setupRenderer() {
            console.log('Setting up renderer...');
            const vm = Scratch.vm;
            console.log('VM:', vm);
            console.log('Runtime:', vm?.runtime);
            console.log('Renderer:', vm?.runtime?.renderer);

            if (!vm || !vm.runtime || !vm.runtime.renderer) {
                console.log('Renderer not ready, retrying...');
                setTimeout(() => this._setupRenderer(), 100);
                return;
            }

            // Проверяем, не были ли уже созданы canvas'ы
            if (this.rayCanvas || this.shadowCanvas) {
                console.log('Canvases already exist, skipping setup');
                return;
            }

            this.renderer = vm.runtime.renderer;
            this.canvas = this.renderer.canvas;
            console.log('Main canvas:', this.canvas);

            // Создаем canvas для ray casting
            this.rayCanvas = document.createElement('canvas');
            this.rayCtx = this.rayCanvas.getContext('2d', { willReadFrequently: true });

            // Создаем canvas для теней
            this.shadowCanvas = document.createElement('canvas');
            this.shadowCtx = this.shadowCanvas.getContext('2d', { willReadFrequently: true });

            // Устанавливаем размеры
            this._updateCanvasSize();

            // Добавляем canvases на сцену
            if (this.canvas.parentElement) {
                console.log('Parent element found:', this.canvas.parentElement);
                
                // Создаем контейнер для наших canvas'ов
                this.container = document.createElement('div');
                this.container.id = 'raycasting-container'; // Добавляем ID для отладки
                this.container.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                `;
                
                this.canvas.parentElement.appendChild(this.container);
                console.log('Container added to DOM');
                
                // Добавляем canvas'ы в контейнер
                this.container.appendChild(this.shadowCanvas);
                this.container.appendChild(this.rayCanvas);
                console.log('Canvases added to container');
                
                // Проверяем, действительно ли canvas'ы в DOM
                console.log('Shadow canvas in DOM:', document.body.contains(this.shadowCanvas));
                console.log('Ray canvas in DOM:', document.body.contains(this.rayCanvas));
                
                // Стили для ray canvas
                this.rayCanvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 2;
                `;
                
                // Стил для shadow canvas
                this.shadowCanvas.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                    mix-blend-mode: multiply;
                `;
            }

            // Добавляем обработчик изменения размера
            window.addEventListener('resize', () => {
                this._updateCanvasSize();
            });

            // Запускаем рендеринг
            this._startRendering();

            // Добавляем обработчики для полноэкранного режима
            document.addEventListener('fullscreenchange', () => this._updateCanvasSize());
            document.addEventListener('webkitfullscreenchange', () => this._updateCanvasSize());
            document.addEventListener('mozfullscreenchange', () => this._updateCanvasSize());
            document.addEventListener('MSFullscreenChange', () => this._updateCanvasSize());
        }

        _setupResizeHandler() {
            window.addEventListener('resize', () => {
                this._updateCanvasSize();
            });
        }

        _updateCanvasSize() {
            if (!this.canvas) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            
            // Используем фиксированный масштаб вместо динамического
            this.baseScale = 1;
            
            // Устанавливаем размеры для ray canvas
            this.rayCanvas.width = rect.width * pixelRatio;
            this.rayCanvas.height = rect.height * pixelRatio;
            this.rayCtx.scale(pixelRatio, pixelRatio);
            
            // Устанавливаем размеры для shadow canvas
            this.shadowCanvas.width = rect.width * pixelRatio;
            this.shadowCanvas.height = rect.height * pixelRatio;
            this.shadowCtx.scale(pixelRatio, pixelRatio);
            
            this.width = rect.width;
            this.height = rect.height;
        }

        _startRendering() {
            const render = () => {
                if (this.rayCtx && this.shadowCtx) {
                    this._renderFrame();
                }
                requestAnimationFrame(render);
            };
            render();
        }

        _renderFrame() {
            if (!this.rayCtx || !this.shadowCtx) {
                console.error('Canvas contexts not initialized');
                return;
            }

            // Очищаем canvas'ы
            this.rayCtx.clearRect(0, 0, this.width, this.height);
            this.shadowCtx.clearRect(0, 0, this.width, this.height);

            // Вовращаем исходное затемнение
            this.shadowCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.shadowCtx.fillRect(0, 0, this.width, this.height);

            // Рисуем все источники света
            for (const light of this.lights.values()) {
                this._renderLight(light);
            }
        }

        _renderLight(light) {
            const lightPos = this._convertToCanvasCoords(light.x, light.y);
            
            // Используем фиксированный размер света
            const lightSize = light.size;

            // Создаем мягкий градиент для света
            const gradient = this.shadowCtx.createRadialGradient(
                lightPos.x, lightPos.y, 0,
                lightPos.x, lightPos.y, lightSize
            );
            
            const alpha = light.intensity / 100;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.7})`);
            gradient.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            // Отбрасываем лучи и собираем точки для полигона тени
            const rayCount = light.quality || 360;
            const shadowPoints = [];

            // Собираем точки пересечения
            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2;
                // Используем фиксированный размер для расчета теней
                const rayEnd = this._castRay(lightPos, angle, lightSize * 1.5);
                shadowPoints.push(rayEnd);
            }

            // Рисуем мягкие тени
            this.shadowCtx.globalCompositeOperation = 'destination-out';
            this.shadowCtx.beginPath();
            this.shadowCtx.moveTo(shadowPoints[0].x, shadowPoints[0].y);
            
            for (let i = 0; i < shadowPoints.length; i++) {
                const current = shadowPoints[i];
                const next = shadowPoints[(i + 1) % shadowPoints.length];
                const nextNext = shadowPoints[(i + 2) % shadowPoints.length];
                
                const cp1x = current.x + (next.x - current.x) * 0.5;
                const cp1y = current.y + (next.y - current.y) * 0.5;
                const cp2x = next.x + (nextNext.x - next.x) * 0.5;
                const cp2y = next.y + (nextNext.y - next.y) * 0.5;
                
                this.shadowCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
            }

            this.shadowCtx.fillStyle = gradient;
            this.shadowCtx.fill();

            // Рисуем лучи света
            if (light.showRays) {
                this.rayCtx.filter = 'blur(4px)';
                this.rayCtx.globalAlpha = 0.3;
                
                for (let i = 0; i < shadowPoints.length; i++) {
                    const start = lightPos;
                    const end = shadowPoints[i];
                    
                    this.rayCtx.beginPath();
                    this.rayCtx.moveTo(start.x, start.y);
                    this.rayCtx.lineTo(end.x, end.y);
                    
                    const rayGradient = this.rayCtx.createLinearGradient(
                        start.x, start.y, end.x, end.y
                    );
                    rayGradient.addColorStop(0, light.color.replace(')', `, ${alpha})`));
                    rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    this.rayCtx.strokeStyle = rayGradient;
                    this.rayCtx.lineWidth = 2;
                    this.rayCtx.stroke();
                }
                
                this.rayCtx.filter = 'none';
                this.rayCtx.globalAlpha = 1;
            }

            this.shadowCtx.globalCompositeOperation = 'source-over';
        }

        _castRay(start, angle, maxDist) {
            let closestPoint = null;
            let minDist = maxDist;

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Используем масштаб из _convertToCanvasCoords
            const SCRATCH_WIDTH = 480;
            const SCRATCH_HEIGHT = 360;
            const scale = Math.min(this.width / SCRATCH_WIDTH, this.height / SCRATCH_HEIGHT);

            // Преобразуем координаты начала луча
            const rayStartX = (start.x - this.width/2) / scale;
            const rayStartY = -(start.y - this.height/2) / scale;

            const step = 0.5;
            const maxSteps = maxDist / step;

            for (const target of Scratch.vm.runtime.targets) {
                if (target.isStage) continue;

                const drawable = this.renderer._allDrawables[target.drawableID];
                if (!drawable || !drawable.skin) continue;

                try {
                    let spriteCanvas = drawable.skin._texture?.canvas || drawable.skin._canvas;
                    if (!spriteCanvas) continue;

                    const spriteCtx = spriteCanvas.getContext('2d', { willReadFrequently: true });
                    const imageData = spriteCtx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);

                    const spriteScale = target.size / 100;
                    const rotation = (90 - target.direction) * Math.PI / 180;

                    for (let i = 0; i < maxSteps; i++) {
                        const worldX = rayStartX + cos * (i * step);
                        const worldY = rayStartY + sin * (i * step);

                        const relX = worldX - target.x;
                        const relY = worldY - target.y;

                        const rotX = relX * Math.cos(-rotation) - relY * Math.sin(-rotation);
                        const rotY = relX * Math.sin(-rotation) + relY * Math.cos(-rotation);

                        const textureX = Math.floor((rotX / spriteScale + spriteCanvas.width/2));
                        const textureY = Math.floor((-rotY / spriteScale + spriteCanvas.height/2));

                        if (textureX >= 0 && textureX < spriteCanvas.width && 
                            textureY >= 0 && textureY < spriteCanvas.height) {

                            const pixelIndex = (textureY * spriteCanvas.width + textureX) * 4 + 3;
                            const alpha = imageData.data[pixelIndex];

                            if (alpha > 10) {
                                const hitX = this.width/2 + worldX * scale;
                                const hitY = this.height/2 - worldY * scale;
                                const dist = Math.hypot(hitX - start.x, hitY - start.y);
                                
                                if (dist < minDist) {
                                    minDist = dist;
                                    closestPoint = { x: hitX, y: hitY };
                                }
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error processing sprite:', e);
                    continue;
                }
            }

            return closestPoint || {
                x: start.x + cos * maxDist,
                y: start.y + sin * maxDist
            };
        }

        _rayPixelIntersection(start, angle, imageData, sprite) {
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            
            // Размер шага для проверки пикселей (меньше = точнее, но медленнее)
            const step = 0.5;
            const maxSteps = Math.hypot(sprite.width, sprite.height) * sprite.scale;

            for (let dist = 0; dist < maxSteps; dist += step) {
                // Позиция в мировых координатах
                const worldX = start.x + dirX * dist;
                const worldY = start.y + dirY * dist;

                // Переводим в локальные координаты срайта
                const dx = worldX - sprite.x;
                const dy = worldY - sprite.y;
                
                // Применяем обратный поворот и масштаб
                const rotatedX = (dx * Math.cos(-sprite.rotation) - dy * Math.sin(-sprite.rotation)) / sprite.scale;
                const rotatedY = (dx * Math.sin(-sprite.rotation) + dy * Math.cos(-sprite.rotation)) / sprite.scale;

                // Переводим в координаты текстуры
                const textureX = Math.floor((rotatedX + sprite.width / 2));
                const textureY = Math.floor((rotatedY + sprite.height / 2));

                // Проверяем, находимся ли мы внутри текстуры
                if (textureX >= 0 && textureX < sprite.width && 
                    textureY >= 0 && textureY < sprite.height) {
                    
                    // Проверяем альфа-канал пикселя
                    const alpha = this._getPixelAlpha(imageData, textureX, textureY, sprite.width);
                    if (alpha > 10) { // Уменьшенный порог для лучшего определ��ния
                        return { x: worldX, y: worldY };
                    }
                }
            }

            return null;
        }

        _getPixelAlpha(imageData, x, y, width) {
            const index = ((y * width) + x) * 4 + 3;
            return imageData.data[index] || 0;
        }

        _getDetailedSpriteShape(target) {
            const bounds = target.getBounds();
            const spriteCoords = this._convertToCanvasCoords(target.x, target.y);
            const scale = target.size / 100;
            const rotation = target.direction * Math.PI / 180;

            // Сначала попробуем получить точную форму
            try {
                const drawable = this.renderer._allDrawables[target.drawableID];
                if (drawable && drawable.skin && drawable.skin._texture) {
                    const points = this._getAccurateShape(drawable.skin._texture.canvas, bounds, scale, spriteCoords, rotation);
                    if (points && points.length > 0) {
                        return points;
                    }
                }
            } catch (e) {
                console.error('Error in shape detection:', e);
            }

            // Если не получилось, возвращаем базовую форму
            return this._getDefaultShape(bounds, scale, spriteCoords, rotation);
        }

        _getAccurateShape(canvas, bounds, scale, spriteCoords, rotation) {
            try {
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const points = [];
                // Увеличиваем точность книрования
                const angleStep = Math.PI / 360; // 0.5 градуса для большей точности
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                
                // Массив для хранения необработанных радиусов
                const rawRadii = [];

                for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
                    const radius = this._findEdgeRadius(imageData, centerX, centerY, angle, canvas.width, canvas.height);
                    if (radius > 0) {
                        rawRadii.push({ angle, radius });
                    }
                }

                // Применяем сглаживание к радиусам
                const smoothedRadii = this._smoothRadii(rawRadii);

                // Преобразуем сглаженные радиус�� в точки
                for (const { angle, radius } of smoothedRadii) {
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;

                    // Нормализуем координаты с учетом размера спрайта
                    const normalizedX = (x / canvas.width - 0.5) * bounds.width * scale;
                    const normalizedY = (y / canvas.height - 0.5) * bounds.height * scale;

                    // Применяем поворот
                    const rotatedX = normalizedX * Math.cos(rotation) - normalizedY * Math.sin(rotation);
                    const rotatedY = normalizedX * Math.sin(rotation) + normalizedY * Math.cos(rotation);

                    points.push({
                        x: spriteCoords.x + rotatedX,
                        y: spriteCoords.y + rotatedY
                    });
                }

                return points;
            } catch (e) {
                console.error('Error in accurate shape detection:', e);
                return null;
            }
        }

        _findEdgeRadius(imageData, centerX, centerY, angle, width, height) {
            const step = 0.25; // Уменьшаем шаг для более точного определения краёв
            const maxRadius = Math.sqrt(width * width + height * height) / 2;
            let lastAlpha = 0;

            for (let r = 0; r <= maxRadius; r += step) {
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;

                if (x < 0 || x >= width || y < 0 || y >= height) continue;

                const alpha = this._getInterpolatedAlpha(imageData, x, y, width);
                
                // Определяем край по резкому изменению прозрачности
                if (Math.abs(alpha - lastAlpha) > 50) { // Порог разлчия
                    return r;
                }
                lastAlpha = alpha;
            }

            return 0;
        }

        _getDefaultShape(bounds, scale, spriteCoords, rotation) {
            const width = Math.abs(bounds.right - bounds.left) * scale;
            const height = Math.abs(bounds.top - bounds.bottom) * scale;
            
            // Создаем базовую прямоугольную форму
            const vertices = [
                { x: -width/2, y: -height/2 },
                { x: width/2, y: -height/2 },
                { x: width/2, y: height/2 },
                { x: -width/2, y: height/2 }
            ];

            // Применяем поворот и смещение
            return vertices.map(v => ({
                x: spriteCoords.x + (v.x * Math.cos(rotation) - v.y * Math.sin(rotation)),
                y: spriteCoords.y + (v.x * Math.sin(rotation) + v.y * Math.cos(rotation))
            }));
        }

        _smoothRadii(radii) {
            if (radii.length < 3) return radii;
            
            const smoothed = [];
            const windowSize = 5; // Размер окна сглаживания
            
            for (let i = 0; i < radii.length; i++) {
                let sum = 0;
                let count = 0;
                
                // Собираем соседние точки для сглаживания
                for (let j = -windowSize; j <= windowSize; j++) {
                    const idx = (i + j + radii.length) % radii.length;
                    sum += radii[idx].radius;
                    count++;
                }
                
                smoothed.push({
                    angle: radii[i].angle,
                    radius: sum / count
                });
            }
            
            return smoothed;
        }

        _getInterpolatedAlpha(imageData, x, y, width) {
            const x1 = Math.floor(x);
            const y1 = Math.floor(y);
            const x2 = Math.ceil(x);
            const y2 = Math.ceil(y);
            
            if (x1 < 0 || x2 >= width || y1 < 0 || y2 >= imageData.height) {
                return 0;
            }

            const fx = x - x1;
            const fy = y - y1;

            const alpha11 = this._getAlpha(imageData, x1, y1, width);
            const alpha12 = this._getAlpha(imageData, x1, y2, width);
            const alpha21 = this._getAlpha(imageData, x2, y1, width);
            const alpha22 = this._getAlpha(imageData, x2, y2, width);

            return (alpha11 * (1 - fx) * (1 - fy) +
                    alpha21 * fx * (1 - fy) +
                    alpha12 * (1 - fx) * fy +
                    alpha22 * fx * fy);
        }

        _getAlpha(imageData, x, y, width) {
            if (x < 0 || x >= width || y < 0 || y >= imageData.height) return 0;
            return imageData.data[((y * width + x) * 4) + 3];
        }

        _getCornerPoints(v1, v2) {
            const cornerRadius = 2; // Радиус закругления углов
            const points = [];
            
            // Добавляем точки вокруг вершин для лучшего определения углов
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                points.push({
                    start: {
                        x: v1.x + Math.cos(angle) * cornerRadius,
                        y: v1.y + Math.sin(angle) * cornerRadius
                    },
                    end: {
                        x: v1.x + Math.cos(angle + Math.PI / 8) * cornerRadius,
                        y: v1.y + Math.sin(angle + Math.PI / 8) * cornerRadius
                    }
                });
            }
            
            return points;
        }

        _getSpriteVertices(target) {
            const bounds = target.getBounds();
            const spriteCoords = this._convertToCanvasCoords(target.x, target.y);
            const scale = target.size / 100;
            
            // Добавляем небольшой отступ для лучшего определения краёв
            const padding = 1;
            const width = (Math.abs(bounds.right - bounds.left) * scale) + padding;
            const height = (Math.abs(bounds.top - bounds.bottom) * scale) + padding;
            const rotation = target.direction * Math.PI / 180;

            // Создаем точки вершин спрайта с небольшим запасом
            const vertices = [
                { x: -width/2, y: -height/2 },
                { x: width/2, y: -height/2 },
                { x: width/2, y: height/2 },
                { x: -width/2, y: height/2 }
            ];

            // Применяем поворот и смещение к каждой вершине
            return vertices.map(v => {
                const rotatedX = v.x * Math.cos(rotation) - v.y * Math.sin(rotation);
                const rotatedY = v.x * Math.sin(rotation) + v.y * Math.cos(rotation);
                return {
                    x: spriteCoords.x + rotatedX,
                    y: spriteCoords.y + rotatedY
                };
            });
        }

        _rayLineIntersection(rayStart, rayAngle, lineStart, lineEnd) {
            // Параметры луча
            const rayDirX = Math.cos(rayAngle);
            const rayDirY = Math.sin(rayAngle);

            // Параметры линии
            const lineX = lineEnd.x - lineStart.x;
            const lineY = lineEnd.y - lineStart.y;

            // ычисляем определитель
            const det = lineX * (-rayDirY) - lineY * (-rayDirX);
            if (Math.abs(det) < 0.000001) return null;

            const t1 = ((rayStart.x - lineStart.x) * (-rayDirY) - (rayStart.y - lineStart.y) * (-rayDirX)) / det;
            const t2 = ((lineStart.x - rayStart.x) * lineY - (lineStart.y - rayStart.y) * lineX) / det;

            if (t1 >= 0 && t1 <= 1 && t2 >= 0) {
                return {
                    x: lineStart.x + lineX * t1,
                    y: lineStart.y + lineY * t1
                };
            }

            return null;
        }

        _drawRay(start, end, color, intensity) {
            this.rayCtx.beginPath();
            this.rayCtx.moveTo(start.x, start.y);
            this.rayCtx.lineTo(end.x, end.y);
            
            const alpha = intensity / 100;
            const rgba = color.replace(')', `, ${alpha})`);
            this.rayCtx.strokeStyle = rgba;
            
            this.rayCtx.lineWidth = 1;
            this.rayCtx.stroke();
        }

        _convertToCanvasCoords(x, y) {
            // Используем базовый масштаб Scratch (480x360)
            const SCRATCH_WIDTH = 480;
            const SCRATCH_HEIGHT = 360;
            
            // Вычисляем масштаб для сохранения пропорций
            const scaleX = this.width / SCRATCH_WIDTH;
            const scaleY = this.height / SCRATCH_HEIGHT;
            const scale = Math.min(scaleX, scaleY);
            
            return {
                x: this.width / 2 + x * scale,
                y: this.height / 2 - y * scale,
                scale: scale
            };
        }

        // Методы для блоков Scratch
        addLight(args) {
            console.log('Adding light with args:', args);
            const light = {
                x: Number(args.X) || 0,
                y: Number(args.Y) || 0,
                size: Number(args.SIZE) || 100,
                intensity: Number(args.INTENSITY) || 100,
                color: args.COLOR || 'rgba(255, 255, 255',
                quality: Number(args.QUALITY) || 360,
                showRays: args.SHOW_RAYS === 'true'
            };
            console.log('Created light object:', light);
            this.lights.set(args.ID, light);
            console.log('Current lights:', this.lights);
        }

        removeLight(args) {
            this.lights.delete(args.ID);
        }

        updateLight(args) {
            const light = this.lights.get(args.ID);
            if (light) {
                Object.assign(light, {
                    x: Number(args.X) || light.x,
                    y: Number(args.Y) || light.y,
                    size: Number(args.SIZE) || light.size,
                    intensity: Number(args.INTENSITY) || light.intensity,
                    color: args.COLOR || light.color,
                    quality: Number(args.QUALITY) || light.quality,
                    showRays: args.SHOW_RAYS === 'true'
                });
            }
        }

        getInfo() {
            return {
                id: 'raycasting',
                name: 'Ray Casting',
                color1: '#FF6B6B',
                color2: '#FF4949',
                blocks: [
                    {
                        opcode: 'addLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'добавить свет [ID] x: [X] y: [Y] размер: [SIZE] яркость: [INTENSITY] цвет: [COLOR] качество: [QUALITY] показывать лучи: [SHOW_RAYS]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'light1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            INTENSITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff' },
                            QUALITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
                            SHOW_RAYS: { type: Scratch.ArgumentType.STRING, menu: 'showRaysMenu' }
                        }
                    },
                    {
                        opcode: 'removeLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'удалить свет [ID]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'light1' }
                        }
                    },
                    {
                        opcode: 'updateLight',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'обновить свет [ID] x: [X] y: [Y] размер: [SIZE] яркость: [INTENSITY] цвет: [COLOR] качество: [QUALITY] показывать лучи: [SHOW_RAYS]',
                        arguments: {
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'light1' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            INTENSITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            COLOR: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff' },
                            QUALITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
                            SHOW_RAYS: { type: Scratch.ArgumentType.STRING, menu: 'showRaysMenu' }
                        }
                    }
                ],
                menus: {
                    showRaysMenu: {
                        acceptReporters: true,
                        items: ['true', 'false']
                    }
                }
            };
        }
    }

    Scratch.extensions.register(new RayCasting());
})(Scratch); 