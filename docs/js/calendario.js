const pedidos = [
  {
    nombre: "Agenda A5 – Camila",
    fecha: "2026-01-15",
    estado: "proceso"
  },
  {
    nombre: "Diario lectura – Sofía",
    fecha: "2026-01-18",
    estado: "pendiente"
  },
  {
    nombre: "Llaveros x10 – Laura",
    fecha: "2026-01-18",
    estado: "urgente"
  }
];

let fechaActual = new Date();

function renderCalendario() {
  const calendario = document.getElementById("calendario");
  calendario.innerHTML = "";

  const mes = fechaActual.getMonth();
  const año = fechaActual.getFullYear();

  document.getElementById("mesActual").innerText =
    fechaActual.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes = new Date(año, mes + 1, 0).getDate();

  for (let i = 0; i < primerDia; i++) {
    calendario.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {
    const divDia = document.createElement("div");
    divDia.className = "dia";

    const numero = document.createElement("div");
    numero.className = "dia-numero";
    numero.innerText = dia;

    divDia.appendChild(numero);

    const fechaStr = `${año}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

    pedidos
      .filter(p => p.fecha === fechaStr)
      .forEach(p => {
        const pedido = document.createElement("div");
        pedido.className = `pedido ${p.estado}`;
        pedido.innerText = p.nombre;
        divDia.appendChild(pedido);
      });

    calendario.appendChild(divDia);
  }
}

document.getElementById("prevMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() - 1);
  renderCalendario();
};

document.getElementById("nextMes").onclick = () => {
  fechaActual.setMonth(fechaActual.getMonth() + 1);
  renderCalendario();
};

renderCalendario();
