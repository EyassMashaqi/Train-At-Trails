// Test timezone handling for datetime-local format
const testDateTimeLocalConversion = () => {
  console.log('🧪 Testing datetime-local to ISO conversion...\n');
  
  // Test case 1: User enters "2025-09-18T15:20" (3:20 PM)
  const datetimeLocal1 = "2025-09-18T15:20";
  const date1 = new Date(datetimeLocal1);
  console.log(`Input: ${datetimeLocal1}`);
  console.log(`Date object: ${date1.toString()}`);
  console.log(`ISO string: ${date1.toISOString()}`);
  console.log(`Back to local: ${date1.toLocaleString()}`);
  console.log('---');
  
  // Test case 2: User enters "2025-08-18T23:22" (11:22 PM)
  const datetimeLocal2 = "2025-08-18T23:22";
  const date2 = new Date(datetimeLocal2);
  console.log(`Input: ${datetimeLocal2}`);
  console.log(`Date object: ${date2.toString()}`);
  console.log(`ISO string: ${date2.toISOString()}`);
  console.log(`Back to local: ${date2.toLocaleString()}`);
  console.log('---');
  
  // Test what we should get when converting back for display
  const testISODate = "2025-09-18T12:20:00.000Z";
  const displayDate = new Date(testISODate);
  console.log(`Database ISO: ${testISODate}`);
  console.log(`Display date: ${displayDate.toString()}`);
  console.log(`Local display: ${displayDate.toLocaleString()}`);
  
  // Test the conversion function for datetime-local input
  const formatForDatetimeLocal = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  console.log(`\nFor datetime-local input: ${formatForDatetimeLocal(testISODate)}`);
};

testDateTimeLocalConversion();