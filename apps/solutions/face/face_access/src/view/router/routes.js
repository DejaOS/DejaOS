/**
 * @layer    view
 * @module   routes
 * @fires    none
 * @listens  none
 * @depends  orientation,routes_portrait,routes_landscape
 *
 * 按 dxDriver.DRIVER.MODEL 选择竖屏 / 横屏路由集。
 * VF201_V10 → 横屏 pages_landscape；其余 → 竖屏 pages。
 */

import { isLandscape } from '../orientation.js';
import registerPortraitRoutes from './routes_portrait.js';
import registerLandscapeRoutes from './routes_landscape.js';

export default function registerRoutes() {
    if (isLandscape()) {
        registerLandscapeRoutes();
        return;
    }
    registerPortraitRoutes();
}
