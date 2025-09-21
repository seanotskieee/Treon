import { db } from './firebase-init.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Submit a rating
export async function submitRating(brand, colorName, ratingValue, userId) {
  try {
    const ratingData = {
      brand,
      colorName,
      rating: parseInt(ratingValue),
      userId,
      createdAt: new Date()
    };
    
    await addDoc(collection(db, "ratings"), ratingData);
    return { success: true };
  } catch (error) {
    console.error("Error submitting rating:", error);
    return { success: false, error: error.message };
  }
}

// Get ratings for a specific color
export async function getColorRatings(brand, colorName) {
  try {
    const q = query(
      collection(db, "ratings"),
      where("brand", "==", brand),
      where("colorName", "==", colorName)
    );
    
    const querySnapshot = await getDocs(q);
    const ratings = [];
    let total = 0;
    let count = 0;
    const distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ratings.push(data);
      total += data.rating;
      count++;
      distribution[data.rating]++;
    });
    
    const average = count > 0 ? (total / count) : 0;
    
    return {
      success: true,
      average,
      count,
      distribution,
      ratings
    };
  } catch (error) {
    console.error("Error getting ratings:", error);
    return { success: false, error: error.message };
  }
}

// Clear all ratings
export async function clearAllRatings() {
  try {
    const querySnapshot = await getDocs(collection(db, "ratings"));
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    return { success: true, message: "All ratings cleared successfully" };
  } catch (error) {
    console.error("Error clearing ratings:", error);
    return { success: false, error: error.message };
  }
}