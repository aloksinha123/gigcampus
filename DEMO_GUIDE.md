# 🎓 GigCampus - Interview Demo Guide

This guide is designed to help you practically demonstrate **GigCampus** to an interviewer. It follows the complete lifecycle of a freelance project on your platform.

---

## 🚀 **1. Introduction (The "Elevator Pitch")**
*"GigCampus is a closed-loop freelance marketplace designed specifically for university students. It connects students who need work done (Clients) with talented student freelancers. The platform ensures security through an **Escrow System**, fairness via **Admin Dispute Resolution**, and quality through maximum transparency and a **Mutual Rating System**."*

---

## 🎬 **2. The Live Demo (Step-by-Step)**

**Preparation:**
- Open **3 Browser Windows/Incognito Tabs** (or use 3 different browsers).
- **Tab 1:** Student Account (`student@test.com`)
- **Tab 2:** Freelancer Account (`freelancer@test.com`)
- **Tab 3:** Admin Account (`admin@test.com`)

### **STEP 1: The Client (Student) Journey**
*(Switch to Tab 1 - Student)*
1.  **Post a Project**:
    *   **Action**: Go to Dashboard -> Click **"Post New Gig"**.
    *   **Fill**: Title: *"Build a React Portfolio Website"*, Budget: *₹5000-₹8000*.
    *   **Explain**: *"I'm creating a project record with a status of `OPEN`. It's now visible to all verified freelancers."*
2.  **View Project**:
    *   **Action**: Click on the newly created project. Show the empty "Proposals" tab.

### **STEP 2: The Freelancer Journey**
*(Switch to Tab 2 - Freelancer)*
1.  **Discovery**:
    *   **Action**: Go to **Marketplace**. Find the *"React Portfolio"* project.
    *   **Explain**: *"Freelancers can filter projects by skill and budget. I see the project is `OPEN`."*
2.  **Bidding**:
    *   **Action**: Click **"Place Bid"**.
    *   **Input**: Price: *₹6000*, Time: *7 Days*, Proposal: *"I have 2 years of React experience..."*
    *   **Explain**: *"When I submit this, a `Bid` record is created linking me to this project. The system checks constraints (e.g., no duplicate bids)."*

### **STEP 3: The Agreement (Escrow Logic)**
*(Switch to Tab 1 - Student)*
1.  **Select a Bid**:
    *   **Action**: Refresh/View Project -> Go to "Proposals" tab. You see the Freelancer's bid.
    *   **Action**: Click **"HIRE NOW"**.
    *   **Explain Important Logic**: *"This is a critical moment. When I click Hire:
        1. The project status updates to `IN_PROGRESS`.
        2. The system **locks the funds** (₹6000) from my wallet into an **Escrow Account**.
        3. Other bids are automatically rejected.
        4. The Freelancer is notified to start working."*

### **STEP 4: Work Submission**
*(Switch to Tab 2 - Freelancer)*
1.  **Submit Deliverable**:
    *   **Action**: Go to "My Projects" -> Open Project.
    *   **Visual**: Show that the status is now `IN_PROGRESS`.
    *   **Action**: Click **"Submit Work"**.
    *   **Input**: Title: *"Final Source Code"*, Link: *"github.com/..."*.
    *   **Explain**: *"I'm submitting a `Deliverable` record. The money is still in escrow; I haven't received it yet."*

### **STEP 5: Completion & Payment**
*(Switch to Tab 1 - Student)*
1.  **Review & Approve**:
    *   **Action**: View Project -> See "Deliverables".
    *   **Action**: Click **"Mark as Complete"** (or Approve).
    *   **Explain**: *"By confirming completion, I trigger the smart contract logic:
        1. The **Escrow releases funds**.
        2. The platform takes a **10% commission**.
        3. The remaining 90% is transferred instantly to the Freelancer's wallet."*

### **STEP 6: Mutual Reviews**
1.  **Leave Review**:
    *   **Action**: A modality pop-up appears (or click "Leave Review").
    *   **Action**: Give 5 Stars -> "Great work!".
    *   **Explain**: *"We implemented a mutual review system. This builds the freelancer's `Reputation Score`, which affects their ranking in future bids."*

---

## 🛡️ **3. The Admin "God Mode" (Optional but Impressive)**
*(Switch to Tab 3 - Admin)*
1.  **Dashboard**:
    *   **Action**: Show the Analytics (Total Revenue, Active Users).
    *   **Explain**: *"I built an Admin Dashboard to monitor the ecosystem health."*
2.  **Dispute Resolution**:
    *   **Scenario**: *"If a project goes wrong, a student can raise a dispute."*
    *   **Action**: Go to **Disputes** tab.
    *   **Explain**: *"As an Admin, I can view the chat logs and deliverables. I have buttons to force-refund the student or force-release payment to the freelancer. This ensures safety."*

---

## 🧠 **4. Technical "Deep Dive" Questions**

**Q: How do you handle security?**
**A:** *"I use **JWT (JSON Web Tokens)** for authentication. Every API route is protected by middleware (`protect`, `admin`). API endpoints verify that the user actually owns the resource they are trying to modify."*

**Q: How does the Escrow work technically?**
**A:** *"I have a `Payment` model with a status field. When a bid is accepted, a payment record is created with status `ESCROWED`. The money is deducted from the Client's `Wallet` model logically. Only when the project status triggers to `COMPLETED` does the backend transaction run to move funds from Escrow to the Freelancer's wallet."*

**Q: What was the hardest challenge?**
**A:** *"Managing the state transitions of a project (Open -> In_Progress -> Completed) and ensuring consistent data across three different user roles. I solved this by strictly defining state machines in my Controllers."*
