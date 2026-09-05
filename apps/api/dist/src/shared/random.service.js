"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomService = void 0;
const common_1 = require("@nestjs/common");
let RandomService = class RandomService {
    generateReferralCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    generateOtp(length = 6) {
        const chars = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return otp;
    }
    generateJwtSecret() {
        const crypto = require('crypto');
        return crypto.randomBytes(48).toString('base64url');
    }
    hashPassword(password) {
        return require('bcrypt').hash(password, 12);
    }
};
exports.RandomService = RandomService;
exports.RandomService = RandomService = __decorate([
    (0, common_1.Injectable)()
], RandomService);
//# sourceMappingURL=random.service.js.map