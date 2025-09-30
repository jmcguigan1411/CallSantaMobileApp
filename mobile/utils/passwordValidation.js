export const passwordCriteria = {
  minLength: {
    test: (password) => password.length >= 10,
    message: 'At least 10 characters',
  },
  maxLength: {
    test: (password) => password.length <= 30,
    message: 'No more than 30 characters',
  },
  uppercase: {
    test: (password) => /[A-Z]/.test(password),
    message: 'At least 1 uppercase letter',
  },
  number: {
    test: (password) => /[0-9]/.test(password),
    message: 'At least 1 number',
  },
  specialChar: {
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    message: 'At least 1 special character (!@#$%^&*...)',
  },
  noSequentialNumbers: {
    test: (password) => {
      // Check for ascending sequences (123, 234, etc.)
      for (let i = 0; i < password.length - 2; i++) {
        const char1 = password.charCodeAt(i);
        const char2 = password.charCodeAt(i + 1);
        const char3 = password.charCodeAt(i + 2);
        
        // Check if all are digits and sequential
        if (
          char1 >= 48 && char1 <= 57 && // is digit
          char2 >= 48 && char2 <= 57 &&
          char3 >= 48 && char3 <= 57 &&
          (char2 === char1 + 1 && char3 === char2 + 1)
        ) {
          return false; // Found ascending sequence like 123
        }
        
        // Check for descending sequences (321, 210, etc.)
        if (
          char1 >= 48 && char1 <= 57 &&
          char2 >= 48 && char2 <= 57 &&
          char3 >= 48 && char3 <= 57 &&
          (char2 === char1 - 1 && char3 === char2 - 1)
        ) {
          return false; // Found descending sequence like 321
        }
      }
      return true;
    },
    message: 'No sequential numbers (e.g., 123 or 321)',
  },
};

export const validatePassword = (password) => {
  const results = {};
  Object.keys(passwordCriteria).forEach((key) => {
    results[key] = passwordCriteria[key].test(password);
  });
  return results;
};

export const isPasswordValid = (password) => {
  return Object.values(validatePassword(password)).every((isValid) => isValid);
};