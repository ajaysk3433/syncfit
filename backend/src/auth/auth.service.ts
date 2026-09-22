import type { App } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { firebaseApp } from "../core/configs/firebase.js";
import { withSpan } from "../core/telemetry/tracer.js";

export class AuthService {
    constructor(private readonly firebaseApp: App) {}

    signUp = async (userData: {
        email: string;
        password: string;
    }) => {
        return withSpan("signUp service ", async () => {
            const auth = getAuth(this.firebaseApp);

            return await auth.createUser({
                email: userData.email,
                password: userData.password,
            });
        });
    };
}

export default new AuthService(firebaseApp);