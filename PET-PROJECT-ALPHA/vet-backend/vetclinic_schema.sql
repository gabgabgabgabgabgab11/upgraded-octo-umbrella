
DROP DATABASE IF EXISTS vetclinic;
CREATE DATABASE vetclinic;
USE vetclinic;

-- ============================================
-- TABLE CREATION
-- ============================================

CREATE TABLE doctors (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  photo VARCHAR(255) NULL,
  specialty VARCHAR(100) NULL
);

CREATE TABLE owners (
    owner_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at DATETIME NULL
);

CREATE TABLE pets (
    pet_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    species VARCHAR(50),
    breed VARCHAR(50),
    age INT,
    owner_id INT,
    last_visit DATETIME NULL,
    medical_notes VARCHAR(255),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at DATETIME NULL,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE SET NULL
);

CREATE TABLE appointments (
    appt_id INT PRIMARY KEY AUTO_INCREMENT,
    date_time DATETIME,
    pet_id INT,
    owner_id INT,
    type VARCHAR(50),
    status VARCHAR(50),
    notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at DATETIME NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE SET NULL
);

CREATE TABLE treatments (
    treatment_id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE,
    pet_id INT,
    diagnosis VARCHAR(255),
    treatment VARCHAR(255),
    medication VARCHAR(255),
    cost DECIMAL(10,2),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at DATETIME NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE SET NULL
);

CREATE TABLE vaccinations (
    vacc_id INT PRIMARY KEY AUTO_INCREMENT,
    pet_id INT,
    vaccination_type VARCHAR(100),
    date_given DATE,
    next_due DATE,
    status VARCHAR(50),
    administered_by VARCHAR(100),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at DATETIME NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE SET NULL
);

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO doctors (email, password, display_name, photo, specialty)
VALUES ('admin@pawcare.com', '$2b$10$XqZ9Z9Z9Z9Z9Z9Z9Z9Z9ZuO', 'Dr. Smith', NULL, 'General Veterinary Medicine');

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- ============================================
-- DOCTORS PROCEDURES
-- ============================================

CREATE PROCEDURE add_doctor(
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_display_name VARCHAR(100),
    IN p_photo VARCHAR(255)
)
BEGIN
    INSERT INTO doctors (email, password, display_name, photo)
    VALUES (p_email, p_password, p_display_name, p_photo);
    SELECT LAST_INSERT_ID() AS doctor_id;
END //

CREATE PROCEDURE getDoctors()
BEGIN
    SELECT doctor_id, email, display_name, photo, specialty FROM doctors;
END //

CREATE PROCEDURE getDoctorById(IN p_doctor_id INT)
BEGIN
  SELECT doctor_id, email, display_name, photo, specialty 
  FROM doctors 
  WHERE doctor_id = p_doctor_id;
END //

CREATE PROCEDURE login_doctor(
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT doctor_id, email, display_name, photo, specialty
    FROM doctors
    WHERE email = p_email AND password = p_password
    LIMIT 1;
END //

-- ============================================
-- OWNERS PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_owners()
BEGIN
    SELECT
        o.owner_id,
        o.name,
        o.phone,
        o.email,
        o.address,
        COUNT(CASE WHEN p.is_archived = FALSE OR p.is_archived IS NULL THEN p.pet_id END) AS pet_count
    FROM owners o
    LEFT JOIN pets p ON o.owner_id = p.owner_id
    WHERE o.is_archived = FALSE OR o.is_archived IS NULL
    GROUP BY o.owner_id, o.name, o.phone, o.email, o.address
    ORDER BY o.owner_id DESC;
END //

CREATE PROCEDURE get_owner_by_id(IN p_owner_id INT)
BEGIN
    SELECT * FROM owners WHERE owner_id = p_owner_id;
END //

CREATE PROCEDURE add_owner(
    IN p_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address VARCHAR(255)
)
BEGIN
    INSERT INTO owners (name, phone, email, address)
    VALUES (p_name, p_phone, p_email, p_address);
    SELECT LAST_INSERT_ID() AS owner_id;
END //

CREATE PROCEDURE update_owner(
    IN p_owner_id INT,
    IN p_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address VARCHAR(255)
)
BEGIN
    UPDATE owners
    SET name = p_name,
        phone = p_phone,
        email = p_email,
        address = p_address
    WHERE owner_id = p_owner_id;
END //

CREATE PROCEDURE delete_owner(IN p_owner_id INT)
BEGIN
    DELETE FROM owners WHERE owner_id = p_owner_id;
END //

CREATE PROCEDURE archive_owner(IN p_owner_id INT)
BEGIN
    UPDATE owners 
    SET is_archived = TRUE, archived_at = NOW() 
    WHERE owner_id = p_owner_id;
END //

CREATE PROCEDURE restore_owner(IN p_owner_id INT)
BEGIN
    UPDATE owners 
    SET is_archived = FALSE, archived_at = NULL 
    WHERE owner_id = p_owner_id;
END //

-- ============================================
-- PETS PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_pets()
BEGIN
    SELECT 
        pets.pet_id,
        pets.name,
        pets.species,
        pets.breed,
        pets.age,
        pets.owner_id,
        pets.last_visit,
        pets.medical_notes,
        owners.name as owner
    FROM pets
    LEFT JOIN owners ON pets.owner_id = owners.owner_id
    WHERE pets.is_archived = FALSE OR pets.is_archived IS NULL
    ORDER BY pets.pet_id DESC;
END //

CREATE PROCEDURE get_pet_by_id(IN p_pet_id INT)
BEGIN
    SELECT pets.*, owners.name as owner
    FROM pets
    LEFT JOIN owners ON pets.owner_id = owners.owner_id
    WHERE pets.pet_id = p_pet_id;
END //

CREATE PROCEDURE add_pet(
    IN p_name VARCHAR(100),
    IN p_species VARCHAR(100),
    IN p_breed VARCHAR(100),
    IN p_age INT,
    IN p_owner_id INT,
    IN p_medical_notes TEXT,
    IN p_last_visit DATETIME
)
BEGIN
    INSERT INTO pets (name, species, breed, age, owner_id, medical_notes, last_visit)
    VALUES (p_name, p_species, p_breed, p_age, p_owner_id, p_medical_notes, p_last_visit);
    SELECT LAST_INSERT_ID() AS pet_id;
END //

CREATE PROCEDURE update_pet(
    IN p_pet_id INT,
    IN p_name VARCHAR(100),
    IN p_species VARCHAR(100),
    IN p_breed VARCHAR(100),
    IN p_age INT,
    IN p_owner_id INT,
    IN p_medical_notes TEXT,
    IN p_last_visit DATETIME
)
BEGIN
    UPDATE pets
    SET name = p_name,
        species = p_species,
        breed = p_breed,
        age = p_age,
        owner_id = p_owner_id,
        medical_notes = p_medical_notes,
        last_visit = p_last_visit
    WHERE pet_id = p_pet_id;
END //

CREATE PROCEDURE delete_pet(IN p_pet_id INT)
BEGIN
    DELETE FROM pets WHERE pet_id = p_pet_id;
END //

CREATE PROCEDURE archive_pet(IN p_pet_id INT)
BEGIN
    UPDATE pets 
    SET is_archived = TRUE, archived_at = NOW() 
    WHERE pet_id = p_pet_id;
END //

CREATE PROCEDURE restore_pet(IN p_pet_id INT)
BEGIN
    UPDATE pets 
    SET is_archived = FALSE, archived_at = NULL 
    WHERE pet_id = p_pet_id;
END //

-- ============================================
-- APPOINTMENTS PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_appointments()
BEGIN
    SELECT 
        a.appt_id,
        a.date_time,
        a.pet_id,
        a.owner_id,
        a.type,
        a.status,
        a.notes,
        p.name as pet,
        o.name as owner
    FROM appointments a
    LEFT JOIN pets p ON a.pet_id = p.pet_id
    LEFT JOIN owners o ON a.owner_id = o.owner_id
    WHERE a.is_archived = FALSE OR a.is_archived IS NULL
    ORDER BY a.date_time DESC;
END //

CREATE PROCEDURE get_appointment_by_id(IN p_appt_id INT)
BEGIN
    SELECT 
        a.*,
        p.name as pet,
        o.name as owner
    FROM appointments a
    LEFT JOIN pets p ON a.pet_id = p.pet_id
    LEFT JOIN owners o ON a.owner_id = o.owner_id
    WHERE a.appt_id = p_appt_id;
END //

CREATE PROCEDURE add_appointment(
    IN p_date_time DATETIME,
    IN p_pet_id INT,
    IN p_owner_id INT,
    IN p_type VARCHAR(100),
    IN p_status VARCHAR(100),
    IN p_notes TEXT
)
BEGIN
    INSERT INTO appointments (date_time, pet_id, owner_id, type, status, notes)
    VALUES (p_date_time, p_pet_id, p_owner_id, p_type, p_status, p_notes);
    SELECT LAST_INSERT_ID() AS appt_id;
END //

CREATE PROCEDURE update_appointment(
    IN p_appt_id INT,
    IN p_date_time DATETIME,
    IN p_pet_id INT,
    IN p_owner_id INT,
    IN p_type VARCHAR(100),
    IN p_status VARCHAR(100),
    IN p_notes TEXT
)
BEGIN
    UPDATE appointments
    SET date_time = p_date_time,
        pet_id = p_pet_id,
        owner_id = p_owner_id,
        type = p_type,
        status = p_status,
        notes = p_notes
    WHERE appt_id = p_appt_id;
END //

CREATE PROCEDURE delete_appointment(IN p_appt_id INT)
BEGIN
    DELETE FROM appointments WHERE appt_id = p_appt_id;
END //

CREATE PROCEDURE archive_appointment(IN p_appt_id INT)
BEGIN
    UPDATE appointments 
    SET is_archived = TRUE, archived_at = NOW() 
    WHERE appt_id = p_appt_id;
END //

CREATE PROCEDURE restore_appointment(IN p_appt_id INT)
BEGIN
    UPDATE appointments 
    SET is_archived = FALSE, archived_at = NULL 
    WHERE appt_id = p_appt_id;
END //

-- ============================================
-- TREATMENTS PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_treatments()
BEGIN
    SELECT 
        t.treatment_id,
        t.date,
        t.pet_id,
        t.diagnosis,
        t.treatment,
        t.medication,
        t.cost,
        p.name as pet
    FROM treatments t
    LEFT JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.is_archived = FALSE OR t.is_archived IS NULL
    ORDER BY t.date DESC;
END //

CREATE PROCEDURE get_treatment_by_id(IN p_treatment_id INT)
BEGIN
    SELECT 
        t.*,
        p.name as pet
    FROM treatments t
    LEFT JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.treatment_id = p_treatment_id;
END //

CREATE PROCEDURE add_treatment(
    IN p_pet_id INT,
    IN p_date DATE,
    IN p_diagnosis VARCHAR(255),
    IN p_treatment VARCHAR(255),
    IN p_medication VARCHAR(255),
    IN p_cost DECIMAL(10,2)
)
BEGIN
    INSERT INTO treatments (pet_id, date, diagnosis, treatment, medication, cost)
    VALUES (p_pet_id, p_date, p_diagnosis, p_treatment, p_medication, p_cost);
    SELECT LAST_INSERT_ID() AS treatment_id;
END //

CREATE PROCEDURE update_treatment(
    IN p_treatment_id INT,
    IN p_pet_id INT,
    IN p_date DATE,
    IN p_diagnosis VARCHAR(255),
    IN p_treatment VARCHAR(255),
    IN p_medication VARCHAR(255),
    IN p_cost DECIMAL(10,2)
)
BEGIN
    UPDATE treatments
    SET pet_id = p_pet_id,
        date = p_date,
        diagnosis = p_diagnosis,
        treatment = p_treatment,
        medication = p_medication,
        cost = p_cost
    WHERE treatment_id = p_treatment_id;
END //

CREATE PROCEDURE delete_treatment(IN p_treatment_id INT)
BEGIN
    DELETE FROM treatments WHERE treatment_id = p_treatment_id;
END //

CREATE PROCEDURE archive_treatment(IN p_treatment_id INT)
BEGIN
    UPDATE treatments 
    SET is_archived = TRUE, archived_at = NOW() 
    WHERE treatment_id = p_treatment_id;
END //

CREATE PROCEDURE restore_treatment(IN p_treatment_id INT)
BEGIN
    UPDATE treatments 
    SET is_archived = FALSE, archived_at = NULL 
    WHERE treatment_id = p_treatment_id;
END //

-- ============================================
-- VACCINATIONS PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_vaccinations()
BEGIN
    SELECT 
        v.vacc_id,
        v.pet_id,
        v.vaccination_type,
        v.date_given,
        v.next_due,
        v.status,
        v.administered_by,
        p.name as pet
    FROM vaccinations v
    LEFT JOIN pets p ON v.pet_id = p.pet_id
    WHERE v.is_archived = FALSE OR v.is_archived IS NULL
    ORDER BY v.date_given DESC;
END //

CREATE PROCEDURE get_vaccination_by_id(IN p_vacc_id INT)
BEGIN
    SELECT 
        v.*,
        p.name as pet
    FROM vaccinations v
    LEFT JOIN pets p ON v.pet_id = p.pet_id
    WHERE v.vacc_id = p_vacc_id;
END //

CREATE PROCEDURE add_vaccination(
    IN p_pet_id INT,
    IN p_vaccination_type VARCHAR(100),
    IN p_date_given DATE,
    IN p_next_due DATE,
    IN p_status VARCHAR(100),
    IN p_administered_by VARCHAR(100)
)
BEGIN
    INSERT INTO vaccinations (pet_id, vaccination_type, date_given, next_due, status, administered_by)
    VALUES (p_pet_id, p_vaccination_type, p_date_given, p_next_due, p_status, p_administered_by);
    SELECT LAST_INSERT_ID() AS vacc_id;
END //

CREATE PROCEDURE update_vaccination(
    IN p_vacc_id INT,
    IN p_pet_id INT,
    IN p_vaccination_type VARCHAR(100),
    IN p_date_given DATE,
    IN p_next_due DATE,
    IN p_status VARCHAR(100),
    IN p_administered_by VARCHAR(100)
)
BEGIN
    UPDATE vaccinations
    SET pet_id = p_pet_id,
        vaccination_type = p_vaccination_type,
        date_given = p_date_given,
        next_due = p_next_due,
        status = p_status,
        administered_by = p_administered_by
    WHERE vacc_id = p_vacc_id;
END //

CREATE PROCEDURE delete_vaccination(IN p_vacc_id INT)
BEGIN
    DELETE FROM vaccinations WHERE vacc_id = p_vacc_id;
END //

CREATE PROCEDURE archive_vaccination(IN p_vacc_id INT)
BEGIN
    UPDATE vaccinations 
    SET is_archived = TRUE, archived_at = NOW() 
    WHERE vacc_id = p_vacc_id;
END //

CREATE PROCEDURE restore_vaccination(IN p_vacc_id INT)
BEGIN
    UPDATE vaccinations 
    SET is_archived = FALSE, archived_at = NULL 
    WHERE vacc_id = p_vacc_id;
END //

-- ============================================
-- ARCHIVE MANAGEMENT PROCEDURES
-- ============================================

CREATE PROCEDURE get_all_archived()
BEGIN
    -- Get all archived items from all tables with unified structure
    SELECT 
        'owner' as type, 
        owner_id as id, 
        name as title, 
        CONCAT(IFNULL(phone, 'No phone'), ' - ', IFNULL(email, 'No email')) as subtitle, 
        archived_at,
        DATEDIFF(DATE_ADD(archived_at, INTERVAL 30 DAY), NOW()) as days_left
    FROM owners 
    WHERE is_archived = TRUE
    
    UNION ALL
    
    SELECT 
        'pet' as type, 
        p.pet_id as id, 
        p.name as title,
        CONCAT(IFNULL(p.species, 'Unknown'), ' - ', IFNULL(o.name, 'No Owner')) as subtitle, 
        p.archived_at,
        DATEDIFF(DATE_ADD(p.archived_at, INTERVAL 30 DAY), NOW()) as days_left
    FROM pets p
    LEFT JOIN owners o ON p.owner_id = o.owner_id
    WHERE p.is_archived = TRUE
    
    UNION ALL
    
    SELECT 
        'appointment' as type, 
        a.appt_id as id,
        CONCAT('Appointment - ', DATE_FORMAT(a.date_time, '%Y-%m-%d %H:%i')) as title,
        CONCAT(IFNULL(o.name, 'No Owner'), ' - ', IFNULL(p.name, 'No Pet')) as subtitle, 
        a.archived_at,
        DATEDIFF(DATE_ADD(a.archived_at, INTERVAL 30 DAY), NOW()) as days_left
    FROM appointments a
    LEFT JOIN owners o ON a.owner_id = o.owner_id
    LEFT JOIN pets p ON a.pet_id = p.pet_id
    WHERE a.is_archived = TRUE
    
    UNION ALL
    
    SELECT 
        'treatment' as type, 
        t.treatment_id as id, 
        IFNULL(t.diagnosis, 'Treatment') as title,
        CONCAT(IFNULL(p.name, 'No Pet'), ' - ', DATE_FORMAT(t.date, '%Y-%m-%d')) as subtitle, 
        t.archived_at,
        DATEDIFF(DATE_ADD(t.archived_at, INTERVAL 30 DAY), NOW()) as days_left
    FROM treatments t
    LEFT JOIN pets p ON t.pet_id = p.pet_id
    WHERE t.is_archived = TRUE
    
    UNION ALL
    
    SELECT 
        'vaccination' as type, 
        v.vacc_id as id, 
        v.vaccination_type as title,
        CONCAT(IFNULL(p.name, 'No Pet'), ' - ', DATE_FORMAT(v.date_given, '%Y-%m-%d')) as subtitle, 
        v.archived_at,
        DATEDIFF(DATE_ADD(v.archived_at, INTERVAL 30 DAY), NOW()) as days_left
    FROM vaccinations v
    LEFT JOIN pets p ON v.pet_id = p.pet_id
    WHERE v.is_archived = TRUE
    
    ORDER BY archived_at DESC;
END //

CREATE PROCEDURE cleanup_expired_archives()
BEGIN
    DECLARE deleted_count INT DEFAULT 0;
    DECLARE owner_count INT DEFAULT 0;
    DECLARE pet_count INT DEFAULT 0;
    DECLARE appt_count INT DEFAULT 0;
    DECLARE treatment_count INT DEFAULT 0;
    DECLARE vacc_count INT DEFAULT 0;
    
    -- Delete expired owners (archived more than 30 days ago)
    DELETE FROM owners 
    WHERE is_archived = TRUE 
    AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET owner_count = ROW_COUNT();
    
    -- Delete expired pets
    DELETE FROM pets 
    WHERE is_archived = TRUE 
    AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET pet_count = ROW_COUNT();
    
    -- Delete expired appointments
    DELETE FROM appointments 
    WHERE is_archived = TRUE 
    AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET appt_count = ROW_COUNT();
    
    -- Delete expired treatments
    DELETE FROM treatments 
    WHERE is_archived = TRUE 
    AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET treatment_count = ROW_COUNT();
    
    -- Delete expired vaccinations
    DELETE FROM vaccinations 
    WHERE is_archived = TRUE 
    AND archived_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    SET vacc_count = ROW_COUNT();
    
    -- Calculate total
    SET deleted_count = owner_count + pet_count + appt_count + treatment_count + vacc_count;
    
    -- Return results
    SELECT 
        deleted_count as total_deleted,
        owner_count as owners_deleted,
        pet_count as pets_deleted,
        appt_count as appointments_deleted,
        treatment_count as treatments_deleted,
        vacc_count as vaccinations_deleted;
END //

CREATE PROCEDURE get_archive_statistics()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM owners WHERE is_archived = TRUE) as archived_owners,
        (SELECT COUNT(*) FROM pets WHERE is_archived = TRUE) as archived_pets,
        (SELECT COUNT(*) FROM appointments WHERE is_archived = TRUE) as archived_appointments,
        (SELECT COUNT(*) FROM treatments WHERE is_archived = TRUE) as archived_treatments,
        (SELECT COUNT(*) FROM vaccinations WHERE is_archived = TRUE) as archived_vaccinations,
        (SELECT COUNT(*) FROM owners WHERE is_archived = TRUE 
         AND archived_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as recently_archived_owners,
        (SELECT COUNT(*) FROM owners WHERE is_archived = TRUE 
         AND archived_at < DATE_SUB(NOW(), INTERVAL 23 DAY)) as expiring_soon_owners;
END //

DELIMITER ;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_owners_archived ON owners(is_archived, archived_at);
CREATE INDEX idx_pets_archived ON pets(is_archived, archived_at);
CREATE INDEX idx_appointments_archived ON appointments(is_archived, archived_at);
CREATE INDEX idx_treatments_archived ON treatments(is_archived, archived_at);
CREATE INDEX idx_vaccinations_archived ON vaccinations(is_archived, archived_at);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all tables
SHOW TABLES;

-- Show all procedures
SHOW PROCEDURE STATUS WHERE Db = 'vetclinic';

-- Test queries
SELECT 'Database setup complete!' as status;
SELECT COUNT(*) as total_procedures FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = 'vetclinic';