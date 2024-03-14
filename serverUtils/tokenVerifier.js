global.tokenVerifier = async (token) => {
    try {
        const decodedToken = await global.firebase.auth().verifyIdToken(token);
        return {
            firebaseUID: decodedToken.uid,
            email: decodedToken.email
        };
    } catch (error) {
        console.log(error);
        return false;
    }
}
