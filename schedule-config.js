// ⏰ CONFIGURAÇÃO DE HORÁRIO COMERCIAL - CUIABÁ/MT
// Funciona das 7h às 18h, Segunda a Sexta

class ScheduleManager {
    constructor() {
        // Timezone de Cuiabá/MT (UTC-4)
        this.timezone = 'America/Cuiaba';
        this.workStart = 7;  // 7h
        this.workEnd = 18;   // 18h
        this.workDays = [1, 2, 3, 4, 5]; // Seg-Sex
    }

    // Obter horário atual de Cuiabá
    getCurrentCuiabaTime() {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", {timeZone: this.timezone}));
    }

    // Verificar se está em horário comercial
    isBusinessHours() {
        const cuiabaTime = this.getCurrentCuiabaTime();
        const hour = cuiabaTime.getHours();
        const dayOfWeek = cuiabaTime.getDay(); // 0=dom, 1=seg...6=sab

        const isWorkDay = this.workDays.includes(dayOfWeek);
        const isWorkHour = hour >= this.workStart && hour < this.workEnd;

        return isWorkDay && isWorkHour;
    }

    // Calcular próximo horário comercial
    getNextBusinessHour() {
        const cuiabaTime = this.getCurrentCuiabaTime();
        let nextStart = new Date(cuiabaTime);

        // Se é fim de semana, ir para segunda
        if (cuiabaTime.getDay() === 0) { // Domingo
            nextStart.setDate(nextStart.getDate() + 1);
        } else if (cuiabaTime.getDay() === 6) { // Sábado
            nextStart.setDate(nextStart.getDate() + 2);
        }

        // Se passou das 18h, ir para próximo dia
        if (cuiabaTime.getHours() >= this.workEnd) {
            nextStart.setDate(nextStart.getDate() + 1);
            // Se o próximo dia for sábado ou domingo
            if (nextStart.getDay() === 6) nextStart.setDate(nextStart.getDate() + 2);
            if (nextStart.getDay() === 0) nextStart.setDate(nextStart.getDate() + 1);
        }

        nextStart.setHours(this.workStart, 0, 0, 0);
        return nextStart;
    }

    // Status detalhado
    getStatus() {
        const cuiabaTime = this.getCurrentCuiabaTime();
        const isOpen = this.isBusinessHours();

        return {
            currentTime: cuiabaTime.toLocaleString('pt-BR'),
            timezone: 'America/Cuiaba (UTC-4)',
            isBusinessHours: isOpen,
            schedule: 'Segunda a Sexta, 7h às 18h',
            nextBusinessHour: isOpen ? 'Funcionando agora' : this.getNextBusinessHour().toLocaleString('pt-BR'),
            status: isOpen ? 'ABERTO' : 'FECHADO'
        };
    }
}

module.exports = ScheduleManager;