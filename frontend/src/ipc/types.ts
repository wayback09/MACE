export type ServerType = 'vanilla' | 'spigot' | 'paper' | 'fabric' | 'quilt' | 'forge';

export interface ServerInstance {
  id: string;
  name: string;
  version: string;
  type: ServerType;
  path: string;
  status: 'offline' | 'starting' | 'online' | 'stopping' | 'restarting' | 'installing';
  javaPath: string;
  memoryMB: number;
  world: string;
  ipAddress: string;
  port: number;
  watchdog: boolean;
}

export interface JavaInstall {
  path: string;
  version: string;
}
