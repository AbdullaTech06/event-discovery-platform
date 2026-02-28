# Gather — Community Event Discovery Platform

Gather is a full-stack web application designed for students and young professionals to discover, share, and track local workshops, meetups, hackathons, and cultural events happening in their city. 

This project was built as a solution for the **GDG Hackathon Solasta 2026**.

## 🚀 Live Demo
https://abdullatech06.github.io/event-discovery-platform/#

---

## 🛠 Framework Used
This project strictly adheres to the hackathon's technical constraints:
- **Frontend**: Pure HTML5, CSS3, and Vanilla JavaScript.
- **Backend & Database**: Firebase Authentication and Cloud Firestore.
- **Hosting**: GitHub Pages

---

## 🏗 Architecture Explanation
The application is structured as a Single Page Application (SPA) to ensure lightning-fast navigation and filtering without full page reloads.

- **Frontend Data Management**: Event and RSVP data is fetched once from Firestore upon load and maintained in local JavaScript state arrays (`events`, `rsvps`). This allows the category chips and search bar to instantly filter events based on the local array.
- **Debounced Search**: The search input features a custom 300ms debounce function. This prevents the DOM from re-rendering on every keystroke, saving CPU cycles and providing a smooth UX.
- **Firebase Authentication**: User state is tracked via an observer (`onAuthStateChanged`). Authenticated users are granted access to personalized features like the 'My Events' dashboard, the 'Create Event' modal, and the ability to RSVP.
- **Atomic Deletions**: Deleting an event utilizes Firestore Batched Writes (`writeBatch`). When an organiser deletes their event, both the event document and all associated RSVP documents are deleted atomically. This guarantees data integrity and prevents orphaned RSVPs.
- **Database Query Optimization**: The initial data load is restricted using Firestore queries (`where`, `orderBy`, `limit`) to fetch only up to 100 upcoming events efficiently, rather than downloading the entire database and filtering client-side.

---

## ⚙️ Setup Instructions
If you wish to run this project locally on your machine:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Run a Local Server**
   Since the app uses ES Modules, it must be served over `http://` or `https://` (not `file://`).
   - If you use VS Code, install the **Live Server** extension and click "Go Live" from `index.html`.
   - Alternatively, use npx:
     ```bash
     npx serve .
     ```

3. **Firebase Configuration**
   The project is pre-configured to connect to the production Firestore database. 

---

## 💡 Edge Cases Handled Gracefully
- **Zero Events / Empty States**: Custom empty state UI is rendered if no events match a search query, or if a user opens their dashboard before creating any events.
- **Form Validation**: Strict client-side validation prevents users from publishing events without required fields, or with dates that occur in the past.
- **Data Protection**: Unauthenticated users are completely blocked from writing or manipulating data by Firestore Security Rules (`firestore.rules`). Users can only query and delete their own RSVPs.

---

## 🔗 Additional Resources
- Problem Statement: Problem Statement 4 — Community Event Discovery Platform (Solasta 2026)
- Database schema and configuration details can be found in `FIREBASE_SETUP.md`.
