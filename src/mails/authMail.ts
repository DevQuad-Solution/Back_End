import fs from "fs";
import path from "path";
import handlebars from "handlebars";

export const welcomeEmail = ({ firstName }: { firstName: string }) => {
  // Read the HTML template
  const htmlTemplate = fs.readFileSync(
    path.join(__dirname, "..", "public", "mail", "welcomeMail.html"),
    "utf-8"
  );

  // Compile the template
  const template = handlebars.compile(htmlTemplate);

  // Generate the final HTML content
  const htmlContent = template({ firstName });

  return htmlContent;
};

export const emailActivation = ({
  firstName,
  activationUrl,
}: {
  firstName: string;
  activationUrl: string;
}) => {
  // Read the HTML template
  const htmlTemplate = fs.readFileSync(
    path.join(__dirname, "..", "public", "mail", "emailActivation.html"),
    "utf-8"
  );

  // Compile the template
  const template = handlebars.compile(htmlTemplate);

  // Generate the final HTML content
  const htmlContent = template({ firstName, activationUrl });

  return htmlContent;
};
