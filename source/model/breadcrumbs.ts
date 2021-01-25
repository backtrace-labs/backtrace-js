const typeManual = 'manual';
const defaultLevel = 'info';

export interface IBreadcrumb {
        id: number,
        timestamp: number,
        level: string,
        type: string,
        message: string,
        attributes: object,
}

export class Breadcrumbs {
        public static readonly attachmentName = 'bt-breadcrumbs-0';
        private breadcrumbLimit: number = -1;
        private _breadcrumbs: IBreadcrumb[] = [];
        private id: number = 0;
        
        constructor(breadcrumbLimit?: number) {
                if (!breadcrumbLimit || breadcrumbLimit <= 0) {
                        this.breadcrumbLimit = -1;
                        return;
                }
                this.breadcrumbLimit = breadcrumbLimit;
        }

        public add(
                message: string,
                attributes={},
                timestamp=this.getNowUnixTimestamp(),
                level: string=defaultLevel, 
                type: string=typeManual,
                ) {
                // breadcrumbs are disabled
                if (this.breadcrumbLimit < 0) {
                        return;
                }
                // if breadcrumbs array is full, purge oldest entry
                while (this._breadcrumbs.length === this.breadcrumbLimit) {	
                        this._breadcrumbs.shift();	
                }
                
                const breadcrumb = {
                        id: this.id++,
                        timestamp,
                        level,
                        type,
                        message,
                        attributes,     
                };
                this._breadcrumbs.push(breadcrumb);
        }
        
        // retrieve breadcrumbs and clear the buffer
        public get() {
                const result = this._breadcrumbs;
                this._breadcrumbs = [];
                return result;
        }
        
        public isEnabled() {
                return this.breadcrumbLimit > 0;
        }
        
        private getNowUnixTimestamp(): number {
                return Math.floor(Date.now() / 1000);
        }
}
