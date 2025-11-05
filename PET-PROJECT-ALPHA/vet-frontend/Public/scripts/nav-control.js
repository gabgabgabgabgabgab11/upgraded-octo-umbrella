// Navigation Access Control System
// Dependency chain: Owners → Pets → Appointments → Treatments → Vaccinations

async function checkNavigationAccess() {
  try {
    // Fetch all data in parallel
    const [ownersRes, petsRes, appointmentsRes, treatmentsRes] = await Promise.all([
      fetch('http://localhost:5000/owners').catch(() => ({ json: () => [] })),
      fetch('http://localhost:5000/pets').catch(() => ({ json: () => [] })),
      fetch('http://localhost:5000/appointments').catch(() => ({ json: () => [] })),
      fetch('http://localhost:5000/treatments').catch(() => ({ json: () => [] }))
    ]);

    const owners = await ownersRes.json();
    const pets = await petsRes.json();
    const appointments = await appointmentsRes.json();
    const treatments = await treatmentsRes.json();

    console.log('Nav Check - Owners:', owners.length, 'Pets:', pets.length, 'Appointments:', appointments.length, 'Treatments:', treatments.length);

    // Get all nav links
    const petsLink = document.querySelector('.nav a[href="pets.html"]');
    const appointmentsLink = document.querySelector('.nav a[href="appointments.html"]');
    const treatmentsLink = document.querySelector('.nav a[href="treatments.html"]');
    const vaccinationsLink = document.querySelector('.nav a[href="vaccinations.html"]');

    // Start by disabling everything except owners
    disableLink(petsLink, 'Please add owners first');
    disableLink(appointmentsLink, 'Please add owners first');
    disableLink(treatmentsLink, 'Please add owners first');
    disableLink(vaccinationsLink, 'Please add owners first');

    // Rule 1: Pets enabled only if owners exist
    if (!owners || owners.length === 0) {
      return; // Stop here, everything stays disabled
    }
    enableLink(petsLink);
    
    // Update messages for remaining disabled links
    disableLink(appointmentsLink, 'Please add pets first');
    disableLink(treatmentsLink, 'Please add pets first');
    disableLink(vaccinationsLink, 'Please add pets first');

    // Rule 2: Appointments enabled only if pets exist
    if (!pets || pets.length === 0) {
      return; // Stop here
    }
    enableLink(appointmentsLink);
    
    // Update messages for remaining disabled links
    disableLink(treatmentsLink, 'Please add appointments first');
    disableLink(vaccinationsLink, 'Please add appointments first');

    // Rule 3: Treatments enabled only if appointments exist
    if (!appointments || appointments.length === 0) {
      return; // Stop here
    }
    enableLink(treatmentsLink);
    
    // Update message for vaccinations
    disableLink(vaccinationsLink, 'Please add treatments first');

    // Rule 4: Vaccinations enabled only if treatments exist
    if (!treatments || treatments.length === 0) {
      return; // Stop here
    }
    enableLink(vaccinationsLink);

  } catch (error) {
    console.error('Error checking navigation access:', error);
  }
}

function disableLink(link, message) {
  if (link) {
    link.classList.add('disabled');
    link.title = message;
  }
}

function enableLink(link) {
  if (link) {
    link.classList.remove('disabled');
    link.title = '';
  }
}

// Make it globally accessible
window.checkNavigationAccess = checkNavigationAccess;

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkNavigationAccess);
} else {
  checkNavigationAccess();
}