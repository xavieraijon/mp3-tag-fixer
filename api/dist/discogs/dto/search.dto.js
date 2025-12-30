"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartSearchDto = exports.SearchQueryDto = exports.SearchTrackDto = exports.SearchReleaseDto = void 0;
const class_validator_1 = require("class-validator");
class SearchReleaseDto {
    artist;
    release;
    type;
}
exports.SearchReleaseDto = SearchReleaseDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchReleaseDto.prototype, "artist", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchReleaseDto.prototype, "release", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['release', 'master', 'all']),
    __metadata("design:type", String)
], SearchReleaseDto.prototype, "type", void 0);
class SearchTrackDto {
    artist;
    track;
    type;
}
exports.SearchTrackDto = SearchTrackDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchTrackDto.prototype, "artist", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchTrackDto.prototype, "track", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['release', 'master', 'all']),
    __metadata("design:type", String)
], SearchTrackDto.prototype, "type", void 0);
class SearchQueryDto {
    q;
    type;
}
exports.SearchQueryDto = SearchQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "q", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['release', 'master', 'all']),
    __metadata("design:type", String)
], SearchQueryDto.prototype, "type", void 0);
class SmartSearchDto {
    artist;
    title;
}
exports.SmartSearchDto = SmartSearchDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartSearchDto.prototype, "artist", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SmartSearchDto.prototype, "title", void 0);
//# sourceMappingURL=search.dto.js.map