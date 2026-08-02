document.addEventListener("DOMContentLoaded", function () {
    const sendBtn = document.getElementById("sendBtn");

    if (sendBtn) {
        sendBtn.addEventListener("click", function () {
            const emailInput = document.getElementById("gmailInput");
            const messageInput = document.getElementById("messageInput");

            const email = emailInput ? emailInput.value.trim() : "";
            const message = messageInput ? messageInput.value.trim() : "";

            if (!email) {
                alert("Please enter a Gmail address.");
                return;
            }

            const subject = "Message from college web";
            const gmailUrl =
                "https://mail.google.com/mail/?view=cm&fs=1&to=" +
                encodeURIComponent(email) +
                "&su=" +
                encodeURIComponent(subject) +
                "&body=" +
                encodeURIComponent(message || "Hello!");

            const newWindow = window.open(gmailUrl, "_blank");
            if (!newWindow) {
                window.location.href =
                    "mailto:" +
                    encodeURIComponent(email) +
                    "?subject=" +
                    encodeURIComponent(subject) +
                    "&body=" +
                    encodeURIComponent(message || "Hello!");
            }
        });
    }
});
