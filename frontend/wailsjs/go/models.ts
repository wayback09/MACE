export namespace servermanager {
	
	export class CreateServerPayload {
	    name: string;
	    version: string;
	    type: string;
	    memoryMB: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateServerPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.type = source["type"];
	        this.memoryMB = source["memoryMB"];
	    }
	}
	export class ServerInstance {
	    id: string;
	    name: string;
	    version: string;
	    type: string;
	    path: string;
	    status: string;
	    javaPath: string;
	    memoryMB: number;
	    world: string;
	    ipAddress: string;
	    port: number;
	    watchdog: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ServerInstance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.type = source["type"];
	        this.path = source["path"];
	        this.status = source["status"];
	        this.javaPath = source["javaPath"];
	        this.memoryMB = source["memoryMB"];
	        this.world = source["world"];
	        this.ipAddress = source["ipAddress"];
	        this.port = source["port"];
	        this.watchdog = source["watchdog"];
	    }
	}
	export class UpdateConfigPayload {
	    id: string;
	    name: string;
	    javaPath: string;
	    memoryMB: number;
	    port: number;
	    watchdog: boolean;
	    rawProps: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateConfigPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.javaPath = source["javaPath"];
	        this.memoryMB = source["memoryMB"];
	        this.port = source["port"];
	        this.watchdog = source["watchdog"];
	        this.rawProps = source["rawProps"];
	    }
	}

}

export namespace utils {
	
	export class JavaInstall {
	    path: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new JavaInstall(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.version = source["version"];
	    }
	}

}

