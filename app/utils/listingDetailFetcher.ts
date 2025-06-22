export async function getListingDetails(listingId: string) {
    try {
      const url = `${process.env.NEXTAUTH_URL}/api/listings/${listingId}/details`;
      console.log("Fetching listing details from URL:", url);
      
      // Use the internal API endpoint instead of direct database access
      const response = await fetch(url);
      
      console.log("Fetch response status:", response.status);
      
      if (!response.ok) {
        console.log("Fetch response not ok:", response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log("Listing details fetched successfully:", data);
      return data;
    } catch (error) {
      console.error('Error fetching listing details:', error);
      return null;
    }
  }
  
  export async function getSharedLinkDetails(linkId: string) {
    try {
      const url = `${process.env.NEXTAUTH_URL}/api/shared-links/${linkId}/details`;
      console.log("Fetching shared link details from URL:", url);
      
      const response = await fetch(url);
      
      console.log("Fetch response status:", response.status);
      
      if (!response.ok) {
        console.log("Fetch response not ok:", response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log("Shared link details fetched successfully:", data);
      return data;
    } catch (error) {
      console.error('Error fetching shared link details:', error);
      return null;
    }
  }