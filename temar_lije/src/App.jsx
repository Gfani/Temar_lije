import AssignmentsTab from "./features/classroom-detail/tabs/AssignmentsTab/AssignmentsTab"
import LiveClassTab from "./features/classroom-detail/tabs/LiveClassTab/LiveClassTab"
import TeacherMemberTab from "./features/classroom-detail/tabs/TeacherMemberTab/TeacherMemberTab"
function App() {


  return (
    <>
      <LiveClassTab />
      <AssignmentsTab />
      <TeacherMemberTab />
    </>
  )
}

export default App
