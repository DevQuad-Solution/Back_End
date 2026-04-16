import fs from "fs";
import path from "path";
import handlebars from "handlebars";

export const forgetPassword = ({
  firstName,
  otp,
}: {
  firstName: string;
  otp: string;
}) => {
  // Read the HTML template
  const htmlTemplate = fs.readFileSync(
    path.join(__dirname, "..", "public", "mail", "forgetPassword.html"),
    "utf-8"
  );

  // Compile the template
  const template = handlebars.compile(htmlTemplate);

  // Generate the final HTML content
  const htmlContent = template({ firstName, otp });

  return htmlContent;
};

export const signupMail = ({
  firstName,
  otp,
}: {
  firstName: string;
  otp: string;
}) => {
  // Read the HTML template
  const htmlTemplate = fs.readFileSync(
    path.join(__dirname, "..", "public", "mail", "signupMail.html"),
    "utf-8"
  );

  // Compile the template
  const template = handlebars.compile(htmlTemplate);

  // Generate the final HTML content
  const htmlContent = template({ firstName, otp });

  return htmlContent;
};
