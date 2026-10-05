import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
export declare class FirebaseAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly firebaseService;
    private readonly prisma;
    constructor(reflector: Reflector, firebaseService: FirebaseService, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
