(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('Local Network должен быть запущен вне песочницы');
    }

    // Загружаем PeerJS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js';
    document.head.appendChild(script);

    class LocalNetwork {
        constructor() {
            this.peer = null;
            this.connections = new Map();
            this.isHost = false;
            this.hostId = null;
            this.myId = null;
            this.lastMessage = null;
            
            // Ждем загрузки PeerJS
            script.onload = () => {
                console.log('PeerJS loaded');
            };
        }

        startServer() {
            if (!window.Peer) return 'Ждите...';
            
            try {
                this.isHost = true;
                this.peer = new Peer();
                
                this.peer.on('open', (id) => {
                    this.myId = id;
                    this.hostId = id;
                    console.log('Server started with ID:', id);
                });

                this.peer.on('connection', (conn) => {
                    console.log('New connection:', conn.peer);
                    this.handleConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.error('Server error:', err);
                });

                return this.myId || 'Подключение...';
            } catch (error) {
                return 'Ошибка: ' + error.message;
            }
        }

        connectToServer(args) {
            if (!window.Peer || !args.SERVER_ID) return false;
            
            try {
                if (!this.peer) {
                    this.peer = new Peer();
                }

                this.peer.on('open', (id) => {
                    this.myId = id;
                    const conn = this.peer.connect(args.SERVER_ID);
                    this.handleConnection(conn);
                });

                return true;
            } catch (error) {
                console.error('Connection error:', error);
                return false;
            }
        }

        handleConnection(conn) {
            this.connections.set(conn.peer, conn);

            conn.on('data', (data) => {
                this.handleMessage(data);
            });

            conn.on('close', () => {
                this.connections.delete(conn.peer);
            });
        }

        sendGameMessage(args) {
            const message = {
                type: args.TYPE,
                data: args.DATA,
                sender: this.myId
            };

            if (this.isHost) {
                // Хост отправляет всем
                this.connections.forEach(conn => {
                    if (conn.open) {
                        conn.send(message);
                    }
                });
            } else if (this.connections.size > 0) {
                // Клиент отправляет хосту
                const hostConn = this.connections.values().next().value;
                if (hostConn && hostConn.open) {
                    hostConn.send(message);
                }
            }
        }

        handleMessage(message) {
            this.lastMessage = message;
            
            // Если хост, то пересылаем сообщение всем остальным
            if (this.isHost) {
                this.connections.forEach(conn => {
                    if (conn.peer !== message.sender && conn.open) {
                        conn.send(message);
                    }
                });
            }
        }

        getPlayerCount() {
            return this.connections.size + 1;
        }

        getMyId() {
            return this.myId || '';
        }

        isConnected() {
            return this.peer && !this.peer.disconnected;
        }

        isHosting() {
            return this.isHost;
        }

        getLastMessage(args) {
            if (this.lastMessage && this.lastMessage.type === args.TYPE) {
                return this.lastMessage.data;
            }
            return '';
        }

        getInfo() {
            return {
                id: 'localnetwork',
                name: 'Multiplayer',
                color1: '#ff4c4c',
                color2: '#ff2929',
                blocks: [
                    {
                        opcode: 'startServer',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'создать сервер'
                    },
                    {
                        opcode: 'connectToServer',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'подключиться к серверу [SERVER_ID]',
                        arguments: {
                            SERVER_ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'server-id'
                            }
                        }
                    },
                    {
                        opcode: 'sendGameMessage',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'отправить [TYPE] : [DATA]',
                        arguments: {
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'move'
                            },
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'up'
                            }
                        }
                    },
                    {
                        opcode: 'getPlayerCount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'количество игроков'
                    },
                    {
                        opcode: 'getMyId',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'мой ID'
                    },
                    {
                        opcode: 'isConnected',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'подключен?'
                    },
                    {
                        opcode: 'isHosting',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'я хост?'
                    },
                    {
                        opcode: 'getLastMessage',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'последнее сообщение типа [TYPE]',
                        arguments: {
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'move'
                            }
                        }
                    }
                ]
            };
        }
    }

    Scratch.extensions.register(new LocalNetwork());
})(Scratch); 