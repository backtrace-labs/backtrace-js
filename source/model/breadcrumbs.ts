const defaultType = 'default';
const acceptedTypes: string[] = [
        'default',
        'error', 
        'warn', 
        'info', 
        'verbose', 
        'debug', 
        'silly'
]; 

export interface IBreadcrumb {
        timestamp: number | null,
        type: string,
        message: string,
        attributes: object,
}

export class Breadcrumbs {
        public static readonly annotationName = 'Breadcrumbs';
        private breadcrumbLimit: number = -1;
        private _breadcrumbs: IBreadcrumb[] = [];
        
        constructor(breadcrumbLimit: number | undefined) {
                if (!breadcrumbLimit || breadcrumbLimit <= 0) {
                        this.breadcrumbLimit = -1;
                        return;
                }
                this.breadcrumbLimit = breadcrumbLimit;
        }

        public add(
                timestamp?: number,
                type?: string,
                message='No message',
                attributes={}
        ) {
                // breadcrumbs are disabled
                if (this.breadcrumbLimit < 0) {
                        return;
                }
                // if breadcrumbs array is full, purge oldest entry
                if (this._breadcrumbs.length === this.breadcrumbLimit) {
                        this._breadcrumbs.shift();
                }

                // validate inputs
                if (!type) {
                        type = defaultType;
                }
                if (!acceptedTypes.includes(type)) {
                        throw new Error('Unknown breadcrumb type');      
                }
                if (!timestamp) {
                        timestamp = Date.now();
                }
                
                const breadcrumb = {
                        timestamp,
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
}
