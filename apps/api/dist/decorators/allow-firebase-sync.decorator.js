"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowUnlinkedFirebaseUser = exports.ALLOW_UNLINKED_FIREBASE_USER_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ALLOW_UNLINKED_FIREBASE_USER_KEY = 'allowUnlinkedFirebaseUser';
const AllowUnlinkedFirebaseUser = () => (0, common_1.SetMetadata)(exports.ALLOW_UNLINKED_FIREBASE_USER_KEY, true);
exports.AllowUnlinkedFirebaseUser = AllowUnlinkedFirebaseUser;
//# sourceMappingURL=allow-firebase-sync.decorator.js.map