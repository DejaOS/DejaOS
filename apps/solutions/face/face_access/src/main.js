/**
 * @layer    app
 * @module   main
 * @fires    none
 * @listens  none
 * @depends  dxLogger,core/lifecycle
 */

import dxLogger from '../dxmodules/dxLogger.js';
import lifecycle from './core/lifecycle.js';

async function bootstrap() {
    try {
        await lifecycle.bootstrap();
        dxLogger.info('face_app 4.0 framework bootstrap success');
    } catch (e) {
        dxLogger.error('face_app 4.0 framework bootstrap failed: ' + e.message);
    }
}

bootstrap();
