interface CreateUserDto {
  name: string
  phone_number: string;
  email: string;
  password: string;
  role: "buyer" | "producer";
  cpf?: string;  
  cnpj?: string;   
  ccir?: string;  
  securityQuestions?: SecurityQuestionsDto; 
}

interface SecurityQuestionsDto {
  answer_1: string;
  answer_2: string;
  answer_3: string;
}
