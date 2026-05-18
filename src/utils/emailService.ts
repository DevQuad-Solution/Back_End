import ensend from '../config/ensend';

export interface EmailData {
  subject: string;
  message: string;
  mailType: 'text' | 'html';
  recipients: [{ address: string; name: string }];
}

const sendMail = async (emailData: EmailData) => {
  const senderIdentity = {
    name: process.env.ENSEND_IDEN_NAME ?? 'Slash It',
    address: process.env.ENSEND_SENDER_IDEN ?? 'support@slashit.com.ng',
  };
  const recipients = emailData.recipients;

  try {
    const { data, error } = await ensend.SendApi.SendMailMessage({
      subject: emailData.subject,
      message: emailData.message,
      sender: senderIdentity,
      recipients,
    });

    if (error) throw error;
    console.log('Email Data: ', data);
    return data;
  } catch (error: any) {
    console.log('Error sending mail with ensend: ', error);
    throw error;
  }
};

export { sendMail };
