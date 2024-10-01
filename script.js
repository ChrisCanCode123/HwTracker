$(document).ready(function() {
    const now = new Date(); // Get the current date and time
    const currentHour = now.getHours(); 
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDbqpqGbhQIz15UlCfR6LgypEsft0eJW4Q",
        authDomain: "homeworksolved-cs.firebaseapp.com",
        projectId: "homeworksolved-cs",
        storageBucket: "homeworksolved-cs.appspot.com",
        messagingSenderId: "154302437776",
        appId: "1:154302437776:web:18f71ec220b9fc0ea5bb15",
        databaseURL: "https://homeworksolved-cs-default-rtdb.europe-west1.firebasedatabase.app", // Updated URL
        measurementId: "G-ZZYZY9MG2B"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // Check Firebase connection
    testFirebaseConnection();

    const lessons = {
        1: ['PE', 'Geography', 'English', 'Physics', 'Biology'],         // Monday
        2: ['Computing', 'Maths', 'RE', 'English', 'Geography'],         // Tuesday
        3: ['Maths', 'English', 'Spanish', 'RE', 'Chemistry'],           // Wednesday
        4: ['Biology', 'RE', 'Spanish', 'English', 'Maths'],             // Thursday
        5: ['Geography', 'Chemistry', 'Maths', 'Computing', 'Physics']   // Friday
    };

    const daySelect = $('#day-select');

    // Function to test Firebase connection
    function testFirebaseConnection() {
        db.ref('testConnection').set({ test: 'This is a test' })
            .then(() => {
                console.log('Connected to Firebase and data written successfully!');
                return db.ref('testConnection').once('value');
            })
            .then(snapshot => {
                console.log('Data from Firebase:', snapshot.val());
            })
            .catch(error => {
                console.error('Error with Firebase:', error);
            });
    }

    // Function to load the schedule for the selected day
    function loadSchedule(day) {
        db.ref(`schedules/${day}`).once('value')
            .then(snapshot => {
                const schedule = lessons[day];
                const tbody = $('tbody');
                tbody.empty(); // Clear the table body

                // Populate table rows
                schedule.forEach((lesson, index) => {
                    const notesKey = `notes-${day}-${index}`;
                    const savedNote = snapshot.val() ? snapshot.val()[notesKey] || '' : '';

                    const row = `
                        <tr>
                            <td>P${index + 1}</td>
                            <td>${lesson}</td>
                            <td><input type="text" class="notes" data-day="${day}" data-index="${index}" value="${savedNote}" placeholder="Add notes..."></td>
                            <td><input type="checkbox" class="homework-done" data-day="${day}" data-index="${index}"></td>
                        </tr>
                    `;
                    tbody.append(row);
                });

                // Set checkbox states
                $('.homework-done').each(function() {
                    const index = $(this).data('index');
                    const isChecked = snapshot.val() && snapshot.val()[`homework-${day}-${index}`];
                    $(this).prop('checked', isChecked === true);
                });
            })
            .catch(error => {
                console.error('Error loading schedule:', error);
            });
    }

    // Get the current day (1-5 for Monday to Friday)
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    weekday = (currentDay === 0) ? 1 : (currentDay === 6) ? 5 : currentDay; // Adjust for Monday to Friday

    // Set the selected value to the current day
    if(currentHour >= 16) weekday+=1;
    daySelect.val(weekday);
    loadSchedule(weekday);
    // Load schedule for the initially selected day
    
    
    // Handle day selection change
    daySelect.on('change', function() {
        loadSchedule($(this).val());
    });

    // Save checkbox state to Firebase when it's changed
    $(document).on('change', '.homework-done', function() {
        const day = $(this).data('day');
        const index = $(this).data('index');
        const isChecked = $(this).prop('checked');
        db.ref(`schedules/${day}/homework-${day}-${index}`).set(isChecked)
            .catch(error => {
                console.error('Error saving homework state:', error);
            });
    });

    // Save notes to Firebase when they are changed
    $(document).on('input', '.notes', function() {
        const day = $(this).data('day');
        const index = $(this).data('index');
        const note = $(this).val();
        db.ref(`schedules/${day}/notes-${day}-${index}`).set(note)
            .catch(error => {
                console.error('Error saving notes:', error);
            });
    });
});
