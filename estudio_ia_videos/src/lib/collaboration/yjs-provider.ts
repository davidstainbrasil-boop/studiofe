import * as Y from 'yjs';
import { logger } from '@/lib/logger';
import { WebsocketProvider } from 'y-websocket';

class YjsProvider {
  private static instance: YjsProvider;
  public doc: Y.Doc;
  public provider: WebsocketProvider | null = null;
  public awareness: any;

  private constructor() {
    this.doc = new Y.Doc();
    // Default room, can be changed via connect
    this.awareness = null;
  }

  public static getInstance(): YjsProvider {
    if (!YjsProvider.instance) {
      YjsProvider.instance = new YjsProvider();
    }
    return YjsProvider.instance;
  }

  public connect(roomId: string, serverUrl: string = 'wss://demos.yjs.dev') {
     if (this.provider) {
         this.provider.destroy();
     }

     this.provider = new WebsocketProvider(serverUrl, roomId, this.doc);
     this.awareness = this.provider.awareness;
     
     this.provider.on('status', (event: any) => {
         logger.info('YJS Connection status:', event.status);
     });
  }

  public disconnect() {
      if (this.provider) {
          this.provider.destroy();
          this.provider = null;
      }
  }

  public getMap(name: string): Y.Map<any> {
      return this.doc.getMap(name);
  }

  public getArray(name: string): Y.Array<any> {
      return this.doc.getArray(name);
  }
}

export const yjsProvider = YjsProvider.getInstance();
