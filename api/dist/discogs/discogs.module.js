"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscogsModule = void 0;
const common_1 = require("@nestjs/common");
const discogs_controller_1 = require("./discogs.controller");
const discogs_service_1 = require("./discogs.service");
const search_service_1 = require("./search.service");
const string_utils_service_1 = require("./string-utils.service");
let DiscogsModule = class DiscogsModule {
};
exports.DiscogsModule = DiscogsModule;
exports.DiscogsModule = DiscogsModule = __decorate([
    (0, common_1.Module)({
        controllers: [discogs_controller_1.DiscogsController],
        providers: [discogs_service_1.DiscogsService, search_service_1.SearchService, string_utils_service_1.StringUtilsService],
        exports: [discogs_service_1.DiscogsService, search_service_1.SearchService, string_utils_service_1.StringUtilsService],
    })
], DiscogsModule);
//# sourceMappingURL=discogs.module.js.map