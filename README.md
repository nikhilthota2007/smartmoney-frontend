# SmartMoney - AI Financial Advisor

An intelligent financial advisory application that provides personalized money-saving advice and budgeting recommendations powered by artificial intelligence.

## Live Demo

**[View Live Application](https://smartmoney-frontend.vercel.app)**

## Features

- AI-powered financial advice using Groq's LLaMA model
- Personalized budgeting recommendations based on income and expenses
- Debt payoff calculator with multiple payment strategies
- Dark mode interface
- Responsive design optimized for mobile and desktop
- Financial health scoring system

## Technology Stack

- **Frontend Framework:** React.js
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Hosting:** Vercel
- **Backend Integration:** RESTful API

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nikhilthota2007/smartmoney-frontend.git
cd smartmoney-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
REACT_APP_API_URL=http://localhost:8080
```

4. Start the development server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

The application consists of a React frontend that communicates with a Java Spring Boot backend. User financial data is processed through the backend API, which interfaces with Groq's AI model to generate personalized financial advice.

## Related Repositories

- [Backend API Repository](https://github.com/nikhilthota2007/smartmoney-backend)

## Author

Nikhil Thota
- GitHub: [@nikhilthota2007](https://github.com/nikhilthota2007)

## License

This project is licensed under the MIT License.
