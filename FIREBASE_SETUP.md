# Firebase setup for Gather

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/).

2. **Enable Authentication**
   - Go to **Build → Authentication → Get started**
   - Open the **Sign-in method** tab and enable **Email/Password**.

3. **Create Firestore**
   - Go to **Build → Firestore Database → Create database**
   - Start in **test mode** for development (restrict rules before going live).

4. **Get your config**
   - Go to **Project settings** (gear) → **Your apps** → Add web app if needed
   - Copy the `firebaseConfig` object.

5. **Update `app.js`**
   - Replace the placeholder `firebaseConfig` at the top of `app.js` with your config:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};
```

6. **Firestore collections used**
   - `events` – event documents (name, desc, date, time, loc, cat, uid, by, img)
   - `rsvps` – documents with `eid` (event id) and `uid` (user id)
   - `users` – document id = Firebase Auth uid; fields: `displayName`, `email`

7. **Security rules (required to post events + safer)**
   - If you **can’t post an event**, the most common cause is Firestore rules blocking writes.
   - In Firebase Console go to **Build → Firestore Database → Rules**.
   - Use the rules from `firestore.rules` in this project (recommended), or paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isEventOwnerById(eventId) {
      return signedIn()
        && get(/databases/$(database)/documents/events/$(eventId)).data.uid == request.auth.uid;
    }

    match /events/{eventId} {
      allow read: if true;
      // Prevent spoofing: require uid written == auth uid
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if signedIn() && resource.data.uid == request.auth.uid;
    }

    match /rsvps/{rsvpId} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.eid is string;
      // RSVP owner OR event owner can delete (allows event cleanup)
      allow delete: if signedIn()
        && (resource.data.uid == request.auth.uid
          || isEventOwnerById(resource.data.eid));
    }

    match /users/{userId} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }
  }
}
```

   - Click **Publish**. Without these rules, authenticated users cannot create events.

8. **Run the app**
   - Open `index.html` in a browser (use a local server if you get CORS errors, e.g. `npx serve .`).
