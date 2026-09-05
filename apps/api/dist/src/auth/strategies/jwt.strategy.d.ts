import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<{
        name: string;
        email: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
    }>;
}
export {};
