"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_controller_1 = require("../controllers/products.controller");
const router = (0, express_1.Router)();
router.get('/', products_controller_1.getProducts);
router.get('/:id', products_controller_1.getProductById);
exports.default = router;
//# sourceMappingURL=products.routes.js.map