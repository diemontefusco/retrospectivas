import { mountDateFields } from "../../../components/dateField.js";

export function bindActionsBindings(ctx) {
  mountDateFields(document);
  const {
    state,
    createAction,
    render
  } = ctx;

    // ACCIONES
    // ===================================================
  
    const add =
      document.querySelector("#addAction");
  
  
    if (add) {
  
      add.onclick = async () => {
  
        const text =
          document
            .querySelector("#actionText")
            .value
            .trim();
  
  
        if (!text) {
  
          alert(
            "Escribí una acción."
          );
  
          return;
        }
  
  
        const owner =
          document
            .querySelector("#actionOwner")
            .value
            .trim()
          || "Por definir";
  
  
        const date =
          document
            .querySelector("#actionDate")
            .value
          || null;
  
  
        add.disabled = true;
  
  
        const { data, error } = await createAction({
          descripcion: text,
          responsable: owner,
          fecha: date,
          retroId: state.retroId
        });
  
  
        if (error) {
  
          console.error(
            "ERROR SUPABASE",
            error
          );
  
          alert(
            "ERROR SUPABASE\n\n" +
            "Code: " +
            (error?.code || "N/A") +
            "\nMessage: " +
            (error?.message || "N/A") +
            "\nDetails: " +
            (error?.details || "N/A")
          );
  
          add.disabled = false;
  
          return;
        }
  
  
        console.log(
          "Acción guardada:",
          data
        );
  
  
        const newAction = {
  
          id:
            data.id,
  
          text:
            data.descripcion,
  
          owner:
            data.responsable,
  
          date:
            data.fecha ||
            "Por definir"
  
        };
  
  
        state.actions.push(
          newAction
        );
  
  
        render();
  
      };
  
    }
}
