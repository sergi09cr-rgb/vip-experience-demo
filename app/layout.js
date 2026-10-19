import './globals.css'
import {DemoTutorialProvider} from './_demo-tutorial'
export const metadata={title:'VIP Experience Demo'}
export default function RootLayout({children}){
  return <html lang="es">
    <body>
      <DemoTutorialProvider>{children}</DemoTutorialProvider>
    </body>
  </html>
}
