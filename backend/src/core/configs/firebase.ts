import {
    initializeApp,
    cert,
    type ServiceAccount,
} from "firebase-admin/app";

import serviceAccount from "../../../syncfit-e535b-firebase-adminsdk-fbsvc-a4879a1607.json"
    with { type: "json" };

export const firebaseApp = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
});